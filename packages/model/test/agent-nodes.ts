import type { DesignDocument, DesignNode, NodeId, Override, Style } from "../src";

type Extra = { parentId?: NodeId; style?: Style; hidden?: boolean };

const base = (id: NodeId, children: NodeId[], { parentId, style = {}, hidden }: Extra) => ({
  id,
  name: id,
  children,
  style,
  ...(parentId === undefined ? {} : { parentId }),
  ...(hidden === undefined ? {} : { hidden }),
});

export const frame = (id: NodeId, children: NodeId[] = [], extra: Extra = {}): DesignNode => ({ ...base(id, children, extra), kind: "frame" });

export const component = (id: NodeId, children: NodeId[] = [], extra: Extra = {}): DesignNode => ({ ...base(id, children, extra), kind: "component" });

export const text = (id: NodeId, value: string, extra: Extra = {}): DesignNode => ({ ...base(id, [], extra), kind: "text", text: value });

export const instance = (id: NodeId, componentId: NodeId, overrides: Override[] = [], extra: Extra = {}): DesignNode => ({
  ...base(id, [], extra),
  kind: "instance",
  componentId,
  overrides,
});

export const agentNodes = (): Map<NodeId, DesignNode> =>
  new Map(
    [
      frame("s", ["card", "note", "ghost"], { style: { width: 400, height: 300 } }),
      instance("card", "c", [{ path: ["title"], text: "Hello" }, { path: ["btn", "label"], text: "Go" }], { parentId: "s", style: { left: 10, top: 20, width: 200, height: 100 } }),
      text("note", "Plain note", { parentId: "s", style: { left: 0, top: 200, width: 100, height: 20 } }),
      frame("ghost", [], { parentId: "s", hidden: true }),
      frame("set", ["c", "c2"]),
      component("c", ["title", "btn", "secret"], { parentId: "set", style: { width: 200, height: 100 } }),
      component("c2", [], { parentId: "set" }),
      text("title", "Title", { parentId: "c", style: { left: 8, top: 8, width: 120, height: 20 } }),
      instance("btn", "bc", [], { parentId: "c", style: { left: 8, top: 50, width: 80, height: 30 } }),
      text("secret", "Hidden", { parentId: "c", hidden: true }),
      component("bc", ["label"], { style: { width: 80, height: 30 } }),
      text("label", "Button", { parentId: "bc", style: { left: 4, top: 4, width: 70, height: 20 } }),
    ].map((n) => [n.id, n]),
  );

export const agentDocument = (nodes = agentNodes()): DesignDocument & { nodes: Map<NodeId, DesignNode> } => ({
  nodes,
  pages: [
    { id: "p1", name: "Screens", screens: [{ id: "s", name: "Home", x: 0, y: 0, width: 400, height: 300 }] },
    { id: "p2", name: "Components", screens: [{ id: "set", name: "Set", x: 0, y: 0, width: 400, height: 300 }, { id: "bc", name: "Button", x: 0, y: 400, width: 80, height: 30 }] },
  ],
});
