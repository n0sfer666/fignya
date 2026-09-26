import type { NodeId } from "@fignya/model";
import { componentOf } from "../tree/component-keys";
import type { FigNode } from "../tree/node-index";
import type { Resolved } from "./instance-resolver";

export type Frame = { nodes: FigNode[]; prefix: NodeId[]; seen: ReadonlySet<NodeId> };

export type Bound = (node: FigNode, ids: NodeId[]) => boolean;

export const componentFrame = (byKey: ReadonlyMap<string, FigNode>, componentId: NodeId | undefined, prefix: NodeId[], seen: ReadonlySet<NodeId>): Frame | undefined => {
  const root = componentId === undefined || seen.has(componentId) ? undefined : byKey.get(componentId);
  return root && { nodes: root.children, prefix, seen: new Set([...seen, root.key]) };
};

const nestedFrame = (byKey: ReadonlyMap<string, FigNode>, resolved: Resolved, node: FigNode, ids: NodeId[], seen: ReadonlySet<NodeId>): Frame | undefined =>
  node.type === "INSTANCE" ? componentFrame(byKey, resolved.swapBelow(ids) ?? componentOf(node.raw), ids, seen) : undefined;

export const modeTargets = (byKey: ReadonlyMap<string, FigNode>, resolved: Resolved, frames: Frame[], bound: Bound): NodeId[][] => {
  const found: NodeId[][] = [];
  const stack = [...frames];
  for (let frame = stack.pop(); frame; frame = stack.pop()) {
    for (const node of frame.nodes) {
      const ids = [...frame.prefix, node.key];
      if (bound(node, ids)) found.push(ids);
      stack.push({ nodes: node.children, prefix: frame.prefix, seen: frame.seen });
      const nested = nestedFrame(byKey, resolved, node, ids, frame.seen);
      if (nested) stack.push(nested);
    }
  }
  return found;
};
