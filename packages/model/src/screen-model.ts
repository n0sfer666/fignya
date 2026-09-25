import type { ScreenModel } from "./document";
import { expandedComponentId, swapTargets } from "./instance";
import type { DesignNode, NodeId, NodeMap } from "./node";

export const screenModel = (nodes: NodeMap, rootId: NodeId): ScreenModel | undefined => {
  if (!nodes.has(rootId)) return undefined;
  const picked = new Map<NodeId, DesignNode>();
  const stack: NodeId[] = [rootId];
  for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
    const node = picked.has(id) ? undefined : nodes.get(id);
    if (!node) continue;
    picked.set(id, node);
    stack.push(...node.children);
    const componentId = expandedComponentId(node);
    if (componentId !== undefined) stack.push(componentId, ...swapTargets(node));
  }
  return { rootId, nodes: picked };
};
