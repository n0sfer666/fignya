import { rec } from "../fig/guards";
import { guidKey, type FigNode, type NodeIndex } from "./node-index";

export const symbolOf = (index: NodeIndex, node: FigNode): FigNode | undefined =>
  node.type === "INSTANCE" ? index.byKey.get(guidKey(rec(rec(node.raw, "symbolData") ?? {}, "symbolID"))) : undefined;

export const renderChildren = (index: NodeIndex, node: FigNode): FigNode[] =>
  node.children.length > 0 ? node.children : (symbolOf(index, node)?.children ?? []);

export const countRendered = (index: NodeIndex, node: FigNode, memo = new Map<string, number>()): number => {
  const cached = memo.get(node.key);
  if (cached !== undefined) return cached;
  memo.set(node.key, 1);
  const total = renderChildren(index, node).reduce((sum, child) => sum + countRendered(index, child, memo), 1);
  memo.set(node.key, total);
  return total;
};
