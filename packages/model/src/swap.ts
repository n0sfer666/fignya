import type { NodeId } from "./node";

export type SwapEvent = "hover" | "enter" | "leave" | "click";

export type Swap = { on: SwapEvent; to: NodeId };
