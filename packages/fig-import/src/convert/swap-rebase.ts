import { sameValue, type NodeId } from "@fignya/model";
import { rec, type Rec } from "../fig/guards";
import { componentOf } from "../tree/component-keys";
import { guidKey, type FigNode } from "../tree/node-index";

const OWN_FIELDS: ReadonlySet<string> = new Set([
  "guid",
  "parentIndex",
  "type",
  "name",
  "symbolData",
  "overrideKey",
  "derivedSymbolData",
  "componentPropAssignments",
  "componentPropRefs",
  "transform",
  "size",
  "visible",
  "stackPositioning",
  "stackChildPrimaryGrow",
  "stackChildAlignSelf",
]);

export const swappedTo = (raw: Rec): NodeId | undefined => {
  const symbol = rec(raw, "overriddenSymbolID");
  return symbol ? guidKey(symbol) : componentOf(raw);
};

const inheritedFields = (raw: Rec, from: Rec, to: Rec): Rec => {
  const inherited: Rec = {};
  for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
    if (!OWN_FIELDS.has(key) && sameValue(raw[key], from[key])) inherited[key] = to[key];
  }
  return inherited;
};

export const settledRaw = (byKey: ReadonlyMap<string, FigNode>, node: FigNode, fields: Rec): Rec => {
  const raw = { ...node.raw, ...fields };
  const from = byKey.get(componentOf(node.raw) ?? "");
  const to = byKey.get(swappedTo(raw) ?? "");
  if (!from || !to || from === to) return raw;
  return { ...node.raw, ...inheritedFields(node.raw, from.raw, to.raw), ...fields };
};
