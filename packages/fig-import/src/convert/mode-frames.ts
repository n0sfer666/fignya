import type { NodeId } from "@fignya/model";
import { componentOf } from "../tree/component-keys";
import type { FigNode } from "../tree/node-index";
import { sameModes } from "../tree/variable-modes";
import type { VariablePaints } from "../tree/variables";
import type { Resolved } from "./instance-resolver";
import type { PathModes } from "./mode-paths";
import { componentFrame, type Frame } from "./mode-targets";

export type ModeFrames = (instance: FigNode, resolved: Resolved) => Frame[];

export const modeFrames = (byKey: ReadonlyMap<string, FigNode>, paints: VariablePaints, modesAt: PathModes): ModeFrames => (instance, resolved) => {
  const root = byKey.get(componentOf(instance.raw) ?? "");
  if (!root) return [];
  const seen: ReadonlySet<NodeId> = new Set([root.key]);
  const shifted = !sameModes(paints.modesOf(instance.raw), paints.modesOf(root.raw));
  if (shifted) return [{ nodes: root.children, prefix: [], seen }];

  const swapFrame = (ids: NodeId[]): Frame | undefined => {
    const node = byKey.get(ids[ids.length - 1] ?? "");
    if (node?.type !== "INSTANCE") return undefined;
    const swapped = byKey.get(resolved.swapBelow(ids) ?? "");
    const moved = swapped !== undefined && swapped.key !== componentOf(node.raw);
    return moved && !sameModes(modesAt(instance, ids), paints.modesOf(swapped.raw)) ? componentFrame(byKey, swapped.key, ids, seen) : undefined;
  };
  return [...resolved.targets.values()].flatMap(({ ids }) => swapFrame(ids) ?? []);
};
