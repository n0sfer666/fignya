import { rec, recs, str, type Rec } from "../fig/guards";
import { STYLE_REFS, type FieldMap } from "../fig/style-refs";
import { refKey } from "./asset-ref";
import { guidKey } from "./node-index";

type Styles = ReadonlyMap<string, Rec>;

const styleIndex = (nodes: Rec[]): Styles => {
  const styles = new Map<string, Rec>();
  for (const node of nodes) {
    if (str(node, "styleType") === undefined) continue;
    for (const key of [str(node, "key"), guidKey(rec(node, "guid"))]) if (key) styles.set(key, node);
  }
  return styles;
};

const styleFields = (styles: Styles, fields: Rec, refName: string, fieldMap: FieldMap): [string, unknown][] => {
  const key = refKey(rec(fields, refName));
  const style = key === undefined ? undefined : styles.get(key);
  if (!style) return [];
  return fieldMap.flatMap(([target, source]): [string, unknown][] => (style[source] === undefined ? [] : [[target, style[source]]]));
};

const styled = (styles: Styles, fields: Rec): Rec => {
  const patch = Object.entries(STYLE_REFS).flatMap(([refName, fieldMap]) => styleFields(styles, fields, refName, fieldMap));
  return patch.length === 0 ? fields : { ...fields, ...Object.fromEntries(patch) };
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
