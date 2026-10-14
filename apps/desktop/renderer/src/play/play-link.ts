import type { NodeId } from "@fignya/model";
import { renderedNode } from "@fignya/render-dom";

export const linkOfElement = (el: Element, isScreen: (id: NodeId) => boolean): NodeId | undefined => {
  const link = renderedNode(el)?.node.link;
  return link !== undefined && isScreen(link) ? link : undefined;
};
