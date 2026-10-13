import { rec, recs, str, type Rec } from "../fig/guards";
import { STYLE_REFS, type FieldMap } from "../fig/style-refs";
import { refKey } from "./asset-ref";
import { guidKey } from "./node-index";
import { bindings } from "./variable-bindings";
import { BOUND_FLOAT_FIELDS, boundField } from "./variable-floats";

type Styles = ReadonlyMap<string, Rec>;

const styleIndex = (nodes: Rec[]): Styles => {
  const styles = new Map<string, Rec>();
  for (const node of nodes) {
    if (str(node, "styleType") === undefined) continue;
    for (const key of [str(node, "key"), guidKey(rec(node, "guid"))]) if (key) styles.set(key, node);
  }
  return styles;
};

type Copied = { patch: [string, unknown][]; covered: string[]; bound: Rec[] };

const FLOATS: ReadonlySet<string> = new Set(BOUND_FLOAT_FIELDS);

const DETACHED = "4294967295:4294967295";

const floatTargets = (fieldMap: FieldMap, style: Rec): string[] =>
  fieldMap.flatMap(([target, source]) => (target === source && FLOATS.has(target) && style[source] !== undefined ? [target] : []));

const detachedFields = (fields: Rec, key: string | undefined, fieldMap: FieldMap): Copied => {
  const loose = key === DETACHED && rec(fields, "variableConsumptionMap") === undefined;
  return { patch: [], covered: loose ? floatTargets(fieldMap, fields) : [], bound: [] };
};

const styleFields = (styles: Styles, fields: Rec, refName: string, fieldMap: FieldMap): Copied => {
  const key = refKey(rec(fields, refName));
  const style = key === undefined ? undefined : styles.get(key);
  if (!style) return detachedFields(fields, key, fieldMap);
  const patch = fieldMap.flatMap(([target, source]): [string, unknown][] => (style[source] === undefined ? [] : [[target, style[source]]]));
  const covered = floatTargets(fieldMap, style);
  return { patch, covered, bound: bindings(style).filter((entry) => covered.includes(boundField(entry) ?? "")) };
};

const withBindings = (fields: Rec, covered: ReadonlySet<string>, bound: Rec[]): Rec => {
  if (covered.size === 0) return fields;
  const own = bindings(fields).filter((entry) => !covered.has(boundField(entry) ?? ""));
  return { ...fields, variableConsumptionMap: { ...rec(fields, "variableConsumptionMap"), entries: [...own, ...bound] } };
};

const styled = (styles: Styles, fields: Rec): Rec => {
  const copied = Object.entries(STYLE_REFS).map(([refName, fieldMap]) => styleFields(styles, fields, refName, fieldMap));
  const patch = copied.flatMap((c) => c.patch);
  const covered = new Set(copied.flatMap((c) => c.covered));
  if (patch.length === 0 && covered.size === 0) return fields;
  return withBindings({ ...fields, ...Object.fromEntries(patch) }, covered, copied.flatMap((c) => c.bound));
};

const withStyles = (styles: Styles, raw: Rec): Rec => {
  const node = str(raw, "styleType") === undefined ? styled(styles, raw) : raw;
  const symbolData = rec(node, "symbolData");
  if (!symbolData) return node;
  const overrides = recs(symbolData, "symbolOverrides");
  const next = overrides.map((o) => styled(styles, o));
  return next.every((o, i) => o === overrides[i]) ? node : { ...node, symbolData: { ...symbolData, symbolOverrides: next } };
};

export const withSharedStyles = (nodes: Rec[]): Rec[] => {
  const styles = styleIndex(nodes);
  return styles.size === 0 ? nodes : nodes.map((node) => withStyles(styles, node));
};
