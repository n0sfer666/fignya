import type { DesignNode, NodeId, ScreenModel, Style } from "@fignya/model";

export const frame = (id: NodeId, children: NodeId[] = [], style: Style = {}): DesignNode => ({ id, name: id, kind: "frame", children, style });

export const modelOf = (rootId: NodeId, nodes: DesignNode[]): ScreenModel => ({ rootId, nodes: new Map(nodes.map((n) => [n.id, n])) });
