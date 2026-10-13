import type { NodeId } from "@fignya/model";

export const findTarget = (root: ParentNode, target: NodeId[]): Element | undefined => {
  let found: Element | undefined;
  for (const id of target) {
    const next = (found ?? root).querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!next) return undefined;
    found = next;
  }
  return found;
};
