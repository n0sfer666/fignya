import { rec, recs, type Rec } from "../fig/guards";
import { guidKey } from "./node-index";
import { bindsFloats, BOUND_FLOAT_FIELDS, withFloats } from "./variable-floats";
import { colorResolver, floatResolver, stringResolver, type Resolve } from "./variable-values";
import { bindsText, withText } from "./variable-text";
import { setKey, variablesOf } from "./variable-index";
import { modeContext, NO_MODES, ownModes, type Lookup, type ModeEntry, type Modes, type SetOf } from "./variable-modes";

export type VariableSource = { resolveColor: Resolve<Rec>; resolveFloat: Resolve<number>; resolveString: Resolve<string>; setOf: SetOf };

export type VariablePaints = {
  modesOf: (node: Rec) => Modes;
  ownModes: (node: Rec) => ModeEntry[];
  bound: (fields: Rec) => boolean;
  repaint: (fields: Rec, modes: Modes) => Rec;
};

const PAINT_FIELDS: readonly string[] = ["fillPaints", "strokePaints"];

export const VARIABLE_FIELDS: readonly string[] = [...PAINT_FIELDS, ...BOUND_FLOAT_FIELDS, "textData"];

const resolvedPaint = (resolve: Resolve<Rec>, modes: Modes, paint: Rec): Rec => {
  const alias = rec(rec(rec(paint, "colorVar") ?? {}, "value") ?? {}, "alias");
  const color = alias && resolve(modes, alias);
  return color ? { ...paint, color, opacity: 1 } : paint;
};

const withPaints = (resolve: Resolve<Rec>, modes: Modes, fields: Rec): Rec => {
  const patch = PAINT_FIELDS.flatMap((key): [string, Rec[]][] => {
    const paints = recs(fields, key);
    const next = paints.map((p) => resolvedPaint(resolve, modes, p));
    return next.every((p, i) => p === paints[i]) ? [] : [[key, next]];
  });
  return patch.length === 0 ? fields : { ...fields, ...Object.fromEntries(patch) };
};

const hasColorVars = (fields: Rec): boolean => PAINT_FIELDS.some((key) => recs(fields, key).some((p) => rec(p, "colorVar") !== undefined));

export const NO_PAINTS: VariablePaints = { modesOf: () => NO_MODES, ownModes: () => [], bound: () => false, repaint: (fields) => fields };

export const variableSource = (nodes: Rec[]): VariableSource | undefined => {
  const vars = variablesOf(nodes);
  return vars.values.size === 0 ? undefined : { resolveColor: colorResolver(vars), resolveFloat: floatResolver(vars), resolveString: stringResolver(vars), setOf: (ref) => setKey(vars, ref) };
};

export const variablePaints = (source: VariableSource | undefined, lookup: Lookup): VariablePaints =>
  source
    ? {
        modesOf: modeContext(lookup, source.setOf),
        ownModes: (node) => ownModes(node, source.setOf),
        bound: (fields) => hasColorVars(fields) || bindsFloats(fields) || bindsText(fields),
        repaint: (fields, modes) => withText(source.resolveString, modes, withFloats(source.resolveFloat, modes, withPaints(source.resolveColor, modes, fields))),
      }
    : NO_PAINTS;

const withNodeVariables = (paints: VariablePaints, raw: Rec): Rec => {
  const symbolData = rec(raw, "symbolData");
  const overrides = recs(symbolData, "symbolOverrides");
  if (!paints.bound(raw) && !overrides.some(paints.bound)) return raw;
  const modes = paints.modesOf(raw);
  const node = paints.repaint(raw, modes);
  const next = overrides.map((o) => paints.repaint(o, modes));
  if (!symbolData || next.every((o, i) => o === overrides[i])) return node;
  return { ...node, symbolData: { ...symbolData, symbolOverrides: next } };
};

export const withVariables = (nodes: Rec[], source: VariableSource | undefined = variableSource(nodes)): Rec[] => {
  if (!source) return nodes;
  const byKey = new Map(nodes.map((node) => [guidKey(rec(node, "guid")), node]));
  const paints = variablePaints(source, (key) => byKey.get(key));
  return nodes.map((node) => withNodeVariables(paints, node));
};
