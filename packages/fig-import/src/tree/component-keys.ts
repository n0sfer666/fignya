import type { NodeId } from "@fignya/model";
import { rec, recs, str, type Rec } from "../fig/guards";
import { guidKey, type FigNode } from "./node-index";

export type PropRef = { node: FigNode; field: string };

export type ComponentKeys = { self: ReadonlySet<string>; nodes: ReadonlyMap<string, FigNode>; refs: ReadonlyMap<string, PropRef[]> };

export const componentOf = (raw: Rec): NodeId | undefined => {
  const symbol = rec(rec(raw, "symbolData") ?? {}, "symbolID");
  return symbol ? guidKey(symbol) : undefined;
};

const addRefs = (refs: Map<string, PropRef[]>, node: FigNode): void => {
  for (const ref of recs(node.raw, "componentPropRefs")) {
    const def = guidKey(rec(ref, "defID"));
    const list = refs.get(def) ?? [];
    list.push({ node, field: str(ref, "componentPropNodeField") ?? "" });
    refs.set(def, list);
  }
};

const keysOfNode = (node: FigNode): string[] => {
  const overrideKey = rec(node.raw, "overrideKey");
  return overrideKey ? [node.key, guidKey(overrideKey)] : [node.key];
};

const indexOf = (root: FigNode | undefined): ComponentKeys => {
  const nodes = new Map<string, FigNode>();
  const refs = new Map<string, PropRef[]>();
  const stack = root ? [...root.children] : [];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (!nodes.has(node.key)) nodes.set(node.key, node);
    const overrideKey = rec(node.raw, "overrideKey");
    if (overrideKey) nodes.set(guidKey(overrideKey), node);
    addRefs(refs, node);
    stack.push(...node.children);
  }
  return { self: new Set(root ? keysOfNode(root) : []), nodes, refs };
};

export const componentKeys = (byKey: ReadonlyMap<string, FigNode>): ((componentId: NodeId) => ComponentKeys) => {
  const cache = new Map<NodeId, ComponentKeys>();
  return (componentId) => {
    const known = cache.get(componentId);
    if (known) return known;
    const keys = indexOf(byKey.get(componentId));
    cache.set(componentId, keys);
    return keys;
  };
};
