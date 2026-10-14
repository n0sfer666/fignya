import type { DesignNode, NodeId, NodeMap } from "./node";

const MAX_ANCESTRY = 256;

export const enclosingComponent = (nodes: NodeMap, node: DesignNode): DesignNode | undefined => {
  let current: DesignNode | undefined = node;
  for (let depth = 0; current && depth < MAX_ANCESTRY; depth += 1) {
    if (current.kind === "component") return current;
    current = current.parentId === undefined ? undefined : nodes.get(current.parentId);
  }
  return undefined;
};

const instancesByComponent = (nodes: NodeMap): Map<NodeId, DesignNode[]> => {
  const index = new Map<NodeId, DesignNode[]>();
  for (const node of nodes.values()) {
    if (node.kind !== "instance") continue;
    const list = index.get(node.componentId);
    if (list) list.push(node);
    else index.set(node.componentId, [node]);
  }
  return index;
};

export type InstanceCounter = (componentId: NodeId) => number;

export const createInstanceCounter = (nodes: NodeMap): InstanceCounter => {
  let index: Map<NodeId, DesignNode[]> | undefined;
  return (componentId) => {
    index ??= instancesByComponent(nodes);
    const seen = new Set<NodeId>([componentId]);
    const queue = [componentId];
    let count = 0;
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      for (const instance of index.get(id) ?? []) {
        count += 1;
        const outer = instance.parentId === undefined ? undefined : nodes.get(instance.parentId);
        const owner = outer && enclosingComponent(nodes, outer);
        if (!owner || seen.has(owner.id)) continue;
        seen.add(owner.id);
        queue.push(owner.id);
      }
    }
    return count;
  };
};
