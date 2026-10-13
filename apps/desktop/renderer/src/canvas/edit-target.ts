import { expandedComponentId, type NodeId } from "@fignya/model";
import { renderedNode } from "@fignya/render-dom";

const expandedId = (el: Element): NodeId | undefined => {
  const node = renderedNode(el)?.node;
  return node && expandedComponentId(node) !== undefined ? node.id : undefined;
};

export const editTarget = (el: Element): NodeId[] | undefined => {
  const id = el.getAttribute("data-id");
  if (!id) return undefined;
  const chain: NodeId[] = [id];
  for (let up = el.parentElement; up; up = up.parentElement) {
    const instance = expandedId(up);
    if (instance !== undefined) chain.unshift(instance);
  }
  return chain;
};

const sameChain = (a: NodeId[] | undefined, b: NodeId[]): boolean => a !== undefined && a.length === b.length && a.every((id, i) => id === b[i]);

export const findEditTarget = (root: ParentNode, target: NodeId[]): Element | undefined => {
  const id = target.at(-1);
  const candidates = id === undefined ? [] : root.querySelectorAll(`[data-id="${CSS.escape(id)}"]`);
  return [...candidates].find((el) => sameChain(editTarget(el), target));
};
