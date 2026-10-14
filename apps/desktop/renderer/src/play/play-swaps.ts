import { expandedComponentId, type NodeId, type NodeMap, type Swap } from "@fignya/model";
import { renderedNode } from "@fignya/render-dom";

export const swapsOfElement = (el: Element): readonly Swap[] => renderedNode(el)?.node.swaps ?? [];

const siblings = (nodes: NodeMap, a: NodeId, b: NodeId): boolean => {
  const parent = nodes.get(a)?.parentId;
  return parent !== undefined && parent === nodes.get(b)?.parentId;
};

export const swapTarget = (holder: Element, to: NodeId, nodes: NodeMap): HTMLElement | undefined => {
  for (let el: Element | null = holder; el; el = el.parentElement) {
    const node = renderedNode(el)?.node;
    const componentId = node && expandedComponentId(node);
    if (componentId !== undefined && siblings(nodes, componentId, to) && el instanceof HTMLElement) return el;
  }
  return undefined;
};
