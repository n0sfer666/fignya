import type { DesignNode, NodeId, NodeMap } from "./node";

export type Box = { x: number; y: number; width: number; height: number };

export type Screen = { id: NodeId; name: string; x: number; y: number; width: number; height: number; content?: Box };

export type Page = { id: string; name: string; screens: Screen[] };

export type DesignDocument = { nodes: NodeMap; pages: Page[] };

export type EditableDocument = { nodes: Map<NodeId, DesignNode>; pages: Page[] };

export type ScreenModel = { rootId: NodeId; nodes: NodeMap };
