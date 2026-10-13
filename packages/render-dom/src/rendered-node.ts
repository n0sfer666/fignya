import type { DesignNode, NodeMap } from "@fignya/model";

export type RenderedNode = { node: DesignNode; component?: DesignNode };

const RENDERED = new WeakMap<Element, RenderedNode>();

export const rememberNode = (el: Element, node: DesignNode, nodes: NodeMap): void => {
  const component = node.kind === "instance" ? nodes.get(node.componentId) : undefined;
  RENDERED.set(el, component ? { node, component } : { node });
};

export const renderedNode = (el: Element): RenderedNode | undefined => RENDERED.get(el);
