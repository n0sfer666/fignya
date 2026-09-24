import type { NodeId, NodeMap } from "./node";

export type Screen = { id: NodeId; name: string; x: number; y: number; width: number; height: number };

export type Page = { id: string; name: string; screens: Screen[] };

export type DesignDocument = { nodes: NodeMap; pages: Page[] };

export type ScreenModel = { rootId: NodeId; nodes: NodeMap };
