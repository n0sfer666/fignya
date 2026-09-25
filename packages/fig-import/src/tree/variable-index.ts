import { rec, recs, str, type Rec } from "../fig/guards";
import { refKey } from "./asset-ref";
import { guidKey } from "./node-index";

export type Variables = { values: ReadonlyMap<string, Rec>; defaults: ReadonlyMap<string, string>; sets: ReadonlyMap<string, string> };

const keysOf = (node: Rec): string[] => [str(node, "key"), guidKey(rec(node, "guid"))].filter((k): k is string => k !== undefined && k !== "");

const defaultMode = (set: Rec): string | undefined => {
  const modes = recs(set, "variableSetModes");
  const first = modes.reduce<Rec | undefined>((best, m) => (best && (str(best, "sortPosition") ?? "") <= (str(m, "sortPosition") ?? "") ? best : m), undefined);
  return first && guidKey(rec(first, "id"));
};

export const variablesOf = (nodes: Rec[]): Variables => {
  const values = new Map<string, Rec>();
  const defaults = new Map<string, string>();
  const sets = new Map<string, string>();
  for (const node of nodes) {
    const type = str(node, "type");
    if (type === "VARIABLE") for (const key of keysOf(node)) values.set(key, node);
    if (type !== "VARIABLE_SET") continue;
    const id = guidKey(rec(node, "guid"));
    const mode = defaultMode(node);
    for (const key of keysOf(node)) sets.set(key, id);
    if (mode !== undefined) defaults.set(id, mode);
  }
  return { values, defaults, sets };
};

export const setKey = (vars: Variables, ref: Rec | undefined): string | undefined => {
  const key = refKey(ref);
  return key === undefined ? undefined : (vars.sets.get(key) ?? key);
};
