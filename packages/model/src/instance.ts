import type { DesignNode, NodeId } from "./node";

export const expandedComponentId = (node: DesignNode): NodeId | undefined =>
  node.kind === "instance" && node.children.length === 0 ? node.componentId : undefined;

export const swapTargets = (node: DesignNode): NodeId[] =>
  node.kind === "instance" ? node.overrides.flatMap((o) => (o.componentId === undefined ? [] : [o.componentId])) : [];
