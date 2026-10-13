import { rec, type Rec } from "../fig/guards";
import { guidKey, type FigNode } from "./node-index";
import type { Modes } from "./variable-modes";
import { NO_PAINTS, type VariablePaints } from "./variables";

const MODE_HOLDERS: ReadonlySet<string> = new Set(["INSTANCE", "SYMBOL"]);

export const withFrozenModes = (nodes: Iterable<FigNode>, paints: VariablePaints): VariablePaints => {
  if (paints === NO_PAINTS) return paints;
  const modes = new Map<string, Modes>();
  for (const node of nodes) if (MODE_HOLDERS.has(node.type)) modes.set(node.key, paints.modesOf(node.raw));
  const modesOf = (raw: Rec): Modes => {
    const key = guidKey(rec(raw, "guid"));
    const found = modes.get(key);
    if (!found) throw new Error(`variable modes of ${key} are not frozen: only instances and components hold them`);
    return found;
  };
  return { ...paints, modesOf };
};
