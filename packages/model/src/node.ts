import type { Color } from "./color";
import type { Style } from "./style";

export type NodeId = string;

export type VectorPath = { d: string; fill: Color; rule: "nonzero" | "evenodd" };

export type Override = { path: NodeId[]; style?: Style; text?: string; hidden?: boolean };

type NodeBase = {
  id: NodeId;
  name: string;
  parentId?: NodeId;
  children: NodeId[];
  style: Style;
  hidden?: boolean;
};

export type FrameNode = NodeBase & { kind: "frame" };
export type ComponentNode = NodeBase & { kind: "component" };
export type TextNode = NodeBase & { kind: "text"; text: string };
export type VectorNode = NodeBase & { kind: "vector"; paths: VectorPath[] };
export type InstanceNode = NodeBase & { kind: "instance"; componentId: NodeId; overrides: Override[] };

export type DesignNode = FrameNode | ComponentNode | TextNode | VectorNode | InstanceNode;

export type NodeMap = ReadonlyMap<NodeId, DesignNode>;
