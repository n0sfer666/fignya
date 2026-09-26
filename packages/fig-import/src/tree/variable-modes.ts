import { rec, recs, type Rec } from "../fig/guards";
import { guidKey, parentKey } from "./node-index";

export type Modes = ReadonlyMap<string, string>;

export type ModeEntry = [string, string];

export type SetOf = (ref: Rec | undefined) => string | undefined;

export type Lookup = (key: string) => Rec | undefined;

export const NO_MODES: Modes = new Map();

export const ownModes = (node: Rec, setOf: SetOf): ModeEntry[] =>
  recs(rec(node, "variableModeBySetMap"), "entries").flatMap((e): ModeEntry[] => {
    const set = setOf(rec(e, "variableSetID"));
    const mode = guidKey(rec(e, "variableModeID"));
    return set === undefined || mode === "" ? [] : [[set, mode]];
  });

export const sameModes = (a: Modes, b: Modes): boolean => a.size === b.size && [...a].every(([set, mode]) => b.get(set) === mode);

export const modeContext = (lookup: Lookup, setOf: SetOf): ((node: Rec) => Modes) => {
  const memo = new Map<string, Modes>();
  const modesOf = (key: string): Modes => {
    const known = memo.get(key);
    if (known) return known;
    const node = lookup(key);
    if (!node) return NO_MODES;
    const inherited = modesOf(parentKey(node));
    const own = ownModes(node, setOf);
    const modes = own.length === 0 ? inherited : new Map([...inherited, ...own]);
    memo.set(key, modes);
    return modes;
  };
  return (node) => modesOf(guidKey(rec(node, "guid")));
};
