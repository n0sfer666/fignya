import type { FigNode } from "../../packages/fig-import/src/tree/node-index";

export const screenFrames = (node: FigNode, keep: (child: FigNode) => boolean): FigNode[] =>
  node.children.filter(keep).flatMap((child) => {
    if (child.type === "SECTION") return screenFrames(child, keep);
    return child.type === "FRAME" ? [child] : [];
  });
