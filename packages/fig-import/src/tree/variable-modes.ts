import { rec, recs, type Rec } from "../fig/guards";
import { guidKey, parentKey } from "./node-index";

export type Modes = ReadonlyMap<string, string>;

type SetOf = (ref: Rec | undefined) => string | undefined;

const NO_MODES: Modes = new Map();

const ownModes = (node: Rec, setOf: SetOf): [string, string][] =>
  recs(rec(node, "variableModeBySetMap"), "entries").flatMap((e): [string, string][] => {
    const set = setOf(rec(e, "variableSetID"));
    const mode = guidKey(rec(e, "variableModeID"));
    return set === undefined || mode === "" ? [] : [[set, mode]];
  });

export const modeContext = (nodes: Rec[], setOf: SetOf): ((node: Rec) => Modes) => {
  const byKey = new Map(nodes.map((node) => [guidKey(rec(node, "guid")), node]));
  const memo = new Map<string, Modes>();
  const modesOf = (key: string): Modes => {
    const known = memo.get(key);
    if (known) return known;
    const node = byKey.get(key);
    if (!node) return NO_MODES;
    const inherited = modesOf(parentKey(node));
    const own = ownModes(node, setOf);
    const modes = own.length === 0 ? inherited : new Map([...inherited, ...own]);
    memo.set(key, modes);
    return modes;
  };
  return (node) => modesOf(guidKey(rec(node, "guid")));
};
