import type { FigNode } from "./node-index";

export const symbolNodes = (nodes: Iterable<FigNode>): ReadonlyMap<string, FigNode> => {
  const kept = new Map<string, FigNode>();
  for (const symbol of nodes) {
    if (symbol.type !== "SYMBOL" || kept.has(symbol.key)) continue;
    const stack = [symbol];
    for (let node = stack.pop(); node; node = stack.pop()) {
      kept.set(node.key, node);
      for (const child of node.children) if (!kept.has(child.key)) stack.push(child);
    }
  }
  return kept;
};
