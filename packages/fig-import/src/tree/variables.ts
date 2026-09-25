import { rec, recs, type Rec } from "../fig/guards";
import { colorResolver, type Resolve } from "./variable-colors";
import { setKey, variablesOf } from "./variable-index";
import { modeContext, type Modes } from "./variable-modes";

const PAINT_FIELDS = ["fillPaints", "strokePaints"];

const resolvedPaint = (resolve: Resolve, modes: Modes, paint: Rec): Rec => {
  const alias = rec(rec(rec(paint, "colorVar") ?? {}, "value") ?? {}, "alias");
  const color = alias && resolve(modes, alias);
  return color ? { ...paint, color, opacity: 1 } : paint;
};

const withPaints = (resolve: Resolve, modes: Modes, fields: Rec): Rec => {
  const patch = PAINT_FIELDS.flatMap((key): [string, Rec[]][] => {
    const paints = recs(fields, key);
    const next = paints.map((p) => resolvedPaint(resolve, modes, p));
    return next.every((p, i) => p === paints[i]) ? [] : [[key, next]];
  });
  return patch.length === 0 ? fields : { ...fields, ...Object.fromEntries(patch) };
};

const hasColorVars = (fields: Rec): boolean => PAINT_FIELDS.some((key) => recs(fields, key).some((p) => rec(p, "colorVar") !== undefined));

const withNodeVariables = (resolve: Resolve, modesOf: (node: Rec) => Modes, raw: Rec): Rec => {
  const symbolData = rec(raw, "symbolData");
  const overrides = recs(symbolData, "symbolOverrides");
  if (!hasColorVars(raw) && !overrides.some(hasColorVars)) return raw;
  const modes = modesOf(raw);
  const node = withPaints(resolve, modes, raw);
  const next = overrides.map((o) => withPaints(resolve, modes, o));
  if (!symbolData || next.every((o, i) => o === overrides[i])) return node;
  return { ...node, symbolData: { ...symbolData, symbolOverrides: next } };
};

export const withVariables = (nodes: Rec[]): Rec[] => {
  const vars = variablesOf(nodes);
  if (vars.values.size === 0) return nodes;
  const resolve = colorResolver(vars);
  const modesOf = modeContext(nodes, (ref) => setKey(vars, ref));
  return nodes.map((node) => withNodeVariables(resolve, modesOf, node));
};
