import { rec, recs, type Rec } from "../fig/guards";
import { refKey } from "./asset-ref";
import { guidKey } from "./node-index";
import { setKey, type Variables } from "./variable-index";
import type { Modes } from "./variable-modes";

export type Resolve = (modes: Modes, ref: Rec) => Rec | undefined;

const MAX_ALIAS_DEPTH = 8;

const colorOf = (vars: Variables, modes: Modes, ref: Rec, depth: number): Rec | undefined => {
  const key = refKey(ref);
  const variable = key === undefined ? undefined : vars.values.get(key);
  if (!variable || depth > MAX_ALIAS_DEPTH) return undefined;
  const set = setKey(vars, rec(variable, "variableSetID")) ?? "";
  const mode = modes.get(set) ?? vars.defaults.get(set);
  const entries = recs(rec(variable, "variableDataValues"), "entries");
  const entry = entries.find((e) => guidKey(rec(e, "modeID")) === mode) ?? entries[0];
  const value = rec(rec(entry ?? {}, "variableData") ?? {}, "value");
  const alias = value && rec(value, "alias");
  return alias ? colorOf(vars, modes, alias, depth + 1) : value && rec(value, "colorValue");
};

export const colorResolver = (vars: Variables): Resolve => {
  const byModes = new WeakMap<Modes, Map<string, Rec | undefined>>();
  return (modes, ref) => {
    const key = refKey(ref);
    if (key === undefined) return undefined;
    const cache = byModes.get(modes) ?? new Map<string, Rec | undefined>();
    byModes.set(modes, cache);
    if (cache.has(key)) return cache.get(key);
    const color = colorOf(vars, modes, ref, 0);
    cache.set(key, color);
    return color;
  };
};
