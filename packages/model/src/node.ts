import type { Color } from "./color";
import type { ImageFit, Style } from "./style";
import type { Swap } from "./swap";

export type NodeId = string;

export type ImageFill = { hash: string; fit: ImageFit };

export type VectorPath = { d: string; fill: Color | ImageFill; rule: "nonzero" | "evenodd" };

export type Constraint = "min" | "center" | "max" | "stretch" | "scale";

export type Constraints = readonly [Constraint, Constraint];

export type Override = { path: NodeId[]; style?: Style; text?: string; hidden?: boolean; paths?: VectorPath[]; componentId?: NodeId; link?: NodeId; swaps?: Swap[] };

type NodeBase = {
  id: NodeId;
  name: string;
  parentId?: NodeId;
  children: NodeId[];
  style: Style;
  hidden?: boolean;
  constraints?: Constraints;
  link?: NodeId;
  swaps?: Swap[];
};

export type FrameNode = NodeBase & { kind: "frame" };
export type ComponentNode = NodeBase & { kind: "component" };
export type TextNode = NodeBase & { kind: "text"; text: string };
export type VectorNode = NodeBase & { kind: "vector"; paths: VectorPath[] };
export type InstanceNode = NodeBase & { kind: "instance"; componentId: NodeId; overrides: Override[] };

export type DesignNode = FrameNode | ComponentNode | TextNode | VectorNode | InstanceNode;

export type NodeMap = ReadonlyMap<NodeId, DesignNode>;
