import type { DesignNode, NodeId, Override, ScreenModel } from "@fignya/model";

export const frame = (id: NodeId, children: NodeId[] = [], link?: NodeId): DesignNode => ({ id, name: id, kind: "frame", children, style: { width: 100, height: 50 }, ...(link ? { link } : {}) });

export const instance = (id: NodeId, componentId: NodeId, link: NodeId, overrides: Override[] = []): DesignNode => ({ id, name: id, kind: "instance", children: [], style: {}, componentId, overrides, link });

export const component = (id: NodeId, children: NodeId[]): DesignNode => ({ id, name: id, kind: "component", children, style: {} });

export const modelOf = (rootId: NodeId, nodes: DesignNode[]): ScreenModel => ({ rootId, nodes: new Map(nodes.map((n) => [n.id, n])) });
