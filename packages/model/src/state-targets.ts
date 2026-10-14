import type { DesignNode, NodeId } from "./node";
import type { Swap } from "./swap";

const targetsOf = (swaps: readonly Swap[] | undefined): NodeId[] => (swaps ?? []).map((s) => s.to);

export const stateTargets = (node: DesignNode): NodeId[] => [
  ...targetsOf(node.swaps),
  ...(node.kind === "instance" ? node.overrides.flatMap((o) => targetsOf(o.swaps)) : []),
];
