import { expandedComponentId } from "./instance";
import type { DesignNode, NodeId, NodeMap } from "./node";
import { outlineLine } from "./outline-line";
import { applyOverride } from "./override";
import { nestedScope, type OverrideScope } from "./override-scope";
import { resolveChain } from "./resolve-chain";

export const OUTLINE_LIMIT = 200;

export const OUTLINE_MAX = 1000;

const MAX_DEPTH = 64;

type Level = { prefix: readonly NodeId[]; scope: OverrideScope; depth: number };

export const outline = (nodes: NodeMap, chain: readonly NodeId[], limit = OUTLINE_LIMIT): string | undefined => {
  const root = resolveChain(nodes, chain);
  if (!root) return undefined;
  const lines: string[] = [];
  let total = 0;
  const visit = (node: DesignNode, level: Level, expand: boolean): void => {
    const own = [...level.prefix, node.id];
    total += 1;
    if (lines.length < limit) lines.push(outlineLine(nodes, node, own, level.scope, level.depth));
    const componentId = expandedComponentId(node);
    const component = componentId === undefined ? undefined : nodes.get(componentId);
    if ((component && !expand) || level.depth >= MAX_DEPTH) return;
    const inner: Level = component
      ? { prefix: own, scope: nestedScope(level.scope, node), depth: level.depth + 1 }
      : { ...level, depth: level.depth + 1 };
    for (const id of (component ?? node).children) {
      const stored = nodes.get(id);
      const child = stored && applyOverride(stored, inner.scope.get(id));
      if (child && !child.hidden) visit(child, inner, false);
    }
  };
  visit(root.node, { prefix: chain.slice(0, -1), scope: root.scope, depth: 0 }, true);
  return total > lines.length ? [...lines, `… ещё ${total - lines.length}`].join("\n") : lines.join("\n");
};
