import type { NodeId } from "@fignya/model";
import { parentKey, type FigNode } from "../tree/node-index";
import type { ModeEntry, Modes } from "../tree/variable-modes";
import type { VariablePaints } from "../tree/variables";

export type PathModes = (instance: FigNode, ids: readonly NodeId[]) => Modes;

const NO_CHAIN: ModeEntry[] = [];

const internKey = (modes: Modes): string => [...modes].map(([set, mode]) => `${set}=${mode}`).sort().join(";");

export const pathModes = (byKey: ReadonlyMap<string, FigNode>, paints: VariablePaints): PathModes => {
  const chains = new Map<string, ModeEntry[]>();
  const chainOf = (key: string): ModeEntry[] => {
    const known = chains.get(key);
    if (known) return known;
    const node = byKey.get(key);
    if (!node || node.type === "SYMBOL") return NO_CHAIN;
    const above = chainOf(parentKey(node.raw));
    const own = paints.ownModes(node.raw);
    const chain = own.length === 0 ? above : [...above, ...own];
    chains.set(key, chain);
    return chain;
  };

  const interned = new Map<string, Modes>();
  return (instance, ids) => {
    const base = paints.modesOf(instance.raw);
    const chain = ids.flatMap(chainOf);
    if (chain.length === 0) return base;
    const modes = new Map([...base, ...chain]);
    const key = internKey(modes);
    const known = interned.get(key);
    if (known) return known;
    interned.set(key, modes);
    return modes;
  };
};
