import type { DesignNode, NodeId, Override, Style } from "../src";

const node = (id: NodeId, name: string, parentId: NodeId | undefined, children: NodeId[] = [], style: Style = {}): DesignNode => ({
  id,
  name,
  kind: "frame",
  children,
  style,
  ...(parentId === undefined ? {} : { parentId }),
});

const component = (id: NodeId, children: NodeId[], style: Style = {}): DesignNode => ({ ...node(id, id, "set", children, style), kind: "component" });

const instance = (id: NodeId, name: string, parentId: NodeId, componentId: NodeId, overrides: Override[] = []): DesignNode => ({
  ...node(id, name, parentId),
  kind: "instance",
  componentId,
  overrides,
});

export const V_STYLE: Style = { width: 50, background: [{ kind: "solid", color: { r: 0, g: 0, b: 0, a: 1 } }], opacity: 1 };

export const D_STYLE: Style = { width: 60, background: [{ kind: "solid", color: { r: 1, g: 1, b: 1, a: 1 } }], opacity: 1, borderRadius: [4, 4, 4, 4] };

export const VARIANT_NODES: DesignNode[] = [
  { ...component("v", ["v-icon", "v-label", "v-label2", "v-box", "v-badge", "v-chip", "v-gone"], V_STYLE), swaps: [{ on: "hover", to: "d" }] },
  { ...component("d", ["d-label", "d-icon", "d-label2", "d-box", "d-badge", "d-chip"], D_STYLE), swaps: [{ on: "leave", to: "v" }] },
  node("v-icon", "icon", "v"),
  node("v-label", "label", "v"),
  node("v-label2", "label", "v"),
  node("v-box", "box", "v", ["v-dot"]),
  node("v-dot", "dot", "v-box"),
  instance("v-badge", "badge", "v", "b1"),
  instance("v-chip", "chip", "v", "c1"),
  node("v-gone", "gone", "v"),
  node("d-label", "label", "d"),
  node("d-icon", "icon", "d"),
  node("d-label2", "label", "d"),
  node("d-box", "box", "d", ["d-dot"]),
  node("d-dot", "dot", "d-box"),
  instance("d-badge", "badge", "d", "b1"),
  instance("d-chip", "chip", "d", "c2"),
  component("b1", ["b1-x"]),
  node("b1-x", "x", "b1"),
  component("c1", ["c1-t"]),
  node("c1-t", "t", "c1"),
  component("c2", ["c2-t"]),
  node("c2-t", "t", "c2"),
  component("c3", []),
];
