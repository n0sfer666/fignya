import type { NodeId } from "@fignya/model";
import { VECTOR_TYPES } from "../convert/vector";
import type { FigNode } from "./node-index";

export type Placement = { node: FigNode; parent: FigNode; parentId?: NodeId };

const SKIPPED_TYPES: ReadonlySet<string> = new Set(["SLICE", "STICKY", "CONNECTOR", "WIDGET"]);

export const childrenOf = (node: FigNode): FigNode[] =>
  VECTOR_TYPES.has(node.type) ? [] : node.children.filter((c) => !SKIPPED_TYPES.has(c.type));

export const childIdsOf = (node: FigNode): NodeId[] => childrenOf(node).map((c) => c.key);

export const placementsOf = (canvases: FigNode[]): Placement[] => {
  const out: Placement[] = [];
  const stack: Placement[] = canvases.flatMap((canvas) => childrenOf(canvas).map((node) => ({ node, parent: canvas }))).reverse();
  for (let next = stack.pop(); next; next = stack.pop()) {
    out.push(next);
    const parent = next.node;
    const children = childrenOf(parent);
    for (let i = children.length - 1; i >= 0; i--) {
      const node = children[i];
      if (node) stack.push({ node, parent, parentId: parent.key });
    }
  }
  return out;
};
