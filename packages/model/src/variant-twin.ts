import type { DesignNode, NodeId, NodeMap } from "./node";

export type SwappedAt = (prefix: readonly NodeId[]) => NodeId | undefined;

type Step = { name: string; nth: number };

const namesakes = (nodes: NodeMap, parent: DesignNode, name: string): NodeId[] => parent.children.filter((id) => nodes.get(id)?.name === name);

const stepsTo = (nodes: NodeMap, root: NodeId, id: NodeId): Step[] | undefined => {
  const steps: Step[] = [];
  const seen = new Set<NodeId>();
  for (let node = nodes.get(id); node && !seen.has(node.id); ) {
    seen.add(node.id);
    const parent = node.parentId === undefined ? undefined : nodes.get(node.parentId);
    if (!parent) return undefined;
    steps.unshift({ name: node.name, nth: namesakes(nodes, parent, node.name).indexOf(node.id) });
    if (parent.id === root) return steps;
    node = parent;
  }
  return undefined;
};

const follow = (nodes: NodeMap, root: NodeId, steps: Step[]): NodeId | undefined =>
  steps.reduce<NodeId | undefined>((at, { name, nth }) => {
    const parent = at === undefined ? undefined : nodes.get(at);
    return parent && namesakes(nodes, parent, name)[nth];
  }, root);

const componentOf = (node: DesignNode | undefined, swapped: NodeId | undefined): NodeId | undefined =>
  swapped ?? (node?.kind === "instance" ? node.componentId : undefined);

export const twinPath = (nodes: NodeMap, from: NodeId, to: NodeId, path: readonly NodeId[], swapped: SwappedAt): NodeId[] | undefined => {
  const [head, ...rest] = path;
  const steps = head === undefined ? undefined : stepsTo(nodes, from, head);
  const twin = steps && follow(nodes, to, steps);
  if (head === undefined || twin === undefined) return undefined;
  if (rest.length === 0) return [twin];
  const inner = componentOf(nodes.get(head), swapped([head]));
  const twinInner = componentOf(nodes.get(twin), swapped([head]));
  if (inner === undefined || twinInner === undefined) return undefined;
  if (inner === twinInner) return [twin, ...rest];
  const tail = twinPath(nodes, inner, twinInner, rest, (prefix) => swapped([head, ...prefix]));
  return tail && [twin, ...tail];
};
