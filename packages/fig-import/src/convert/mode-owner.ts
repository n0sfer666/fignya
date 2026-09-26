import type { NodeId } from "@fignya/model";
import { componentOf } from "../tree/component-keys";
import { parentKey, type FigNode } from "../tree/node-index";
import type { Resolved } from "./instance-resolver";

export type ModeOwner = (ids: readonly NodeId[]) => number;

export const modeOwner = (byKey: ReadonlyMap<string, FigNode>, resolve: (instance: FigNode) => Resolved): ModeOwner => {
  const symbols = new Map<string, NodeId | undefined>();
  const symbolOf = (key: string): NodeId | undefined => {
    if (symbols.has(key)) return symbols.get(key);
    const node = byKey.get(key);
    const symbol = !node || node.type === "SYMBOL" ? node?.key : symbolOf(parentKey(node.raw));
    symbols.set(key, symbol);
    return symbol;
  };

  const drawnAt = (ids: readonly NodeId[], depth: number): NodeId | undefined => {
    const outer = byKey.get(ids[0] ?? "");
    const swap = depth > 0 && outer ? resolve(outer).swapBelow(ids.slice(1, depth + 1)) : undefined;
    const node = byKey.get(ids[depth] ?? "");
    return swap ?? (node ? componentOf(node.raw) : undefined);
  };

  return (ids) => {
    for (let depth = ids.length - 2; depth >= 0; depth--) {
      if (symbolOf(ids[depth + 1] ?? "") !== drawnAt(ids, depth)) return depth + 1;
    }
    return 0;
  };
};
