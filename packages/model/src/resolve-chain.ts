import { expandedComponentId } from "./instance";
import type { DesignNode, NodeId, NodeMap } from "./node";
import { applyOverride } from "./override";
import { EMPTY_SCOPE, nestedScope, type OverrideScope } from "./override-scope";

export type ResolvedNode = { node: DesignNode; scope: OverrideScope };

const MAX_ANCESTRY = 256;

export const isInside = (nodes: NodeMap, node: DesignNode, ancestorId: NodeId): boolean => {
  let current = node.parentId === undefined ? undefined : nodes.get(node.parentId);
  for (let depth = 0; current && depth < MAX_ANCESTRY; depth += 1) {
    if (current.id === ancestorId) return true;
    current = current.parentId === undefined ? undefined : nodes.get(current.parentId);
  }
  return false;
};

export const resolveChain = (nodes: NodeMap, chain: readonly NodeId[]): ResolvedNode | undefined => {
  let resolved: ResolvedNode | undefined;
  for (const id of chain) {
    const stored = nodes.get(id);
    if (!stored) return undefined;
    const outer = resolved?.node;
    const componentId = outer && expandedComponentId(outer);
    if (outer && (componentId === undefined || !isInside(nodes, stored, componentId))) return undefined;
    const scope = outer && resolved ? nestedScope(resolved.scope, outer) : EMPTY_SCOPE;
    resolved = { node: applyOverride(stored, scope.get(id)), scope };
  }
  return resolved;
};
