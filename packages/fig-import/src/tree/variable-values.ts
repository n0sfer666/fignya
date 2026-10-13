import { num, rec, recs, str, type Rec } from "../fig/guards";
import { refKey } from "./asset-ref";
import { guidKey } from "./node-index";
import { setKey, type Variables } from "./variable-index";
import type { Modes } from "./variable-modes";

export type Resolve<T> = (modes: Modes, ref: Rec) => T | undefined;

const MAX_ALIAS_DEPTH = 8;

const valueOf = (vars: Variables, modes: Modes, ref: Rec, depth: number): Rec | undefined => {
  const key = refKey(ref);
  const variable = key === undefined ? undefined : vars.values.get(key);
  if (!variable || depth > MAX_ALIAS_DEPTH) return undefined;
  const set = setKey(vars, rec(variable, "variableSetID")) ?? "";
  const mode = modes.get(set) ?? vars.defaults.get(set);
  const entries = recs(rec(variable, "variableDataValues"), "entries");
  const entry = entries.find((e) => guidKey(rec(e, "modeID")) === mode) ?? entries[0];
  const value = rec(rec(entry ?? {}, "variableData") ?? {}, "value");
  const alias = value && rec(value, "alias");
  return alias ? valueOf(vars, modes, alias, depth + 1) : value;
};

const cachedResolver = <T>(vars: Variables, pick: (value: Rec) => T | undefined): Resolve<T> => {
  const byModes = new WeakMap<Modes, Map<string, T | undefined>>();
  return (modes, ref) => {
    const key = refKey(ref);
    if (key === undefined) return undefined;
    const cache = byModes.get(modes) ?? new Map<string, T | undefined>();
    byModes.set(modes, cache);
    if (cache.has(key)) return cache.get(key);
    const value = valueOf(vars, modes, ref, 0);
    const picked = value && pick(value);
    cache.set(key, picked);
    return picked;
  };
};

export const colorResolver = (vars: Variables): Resolve<Rec> => cachedResolver(vars, (value) => rec(value, "colorValue"));

export const floatResolver = (vars: Variables): Resolve<number> => cachedResolver(vars, (value) => num(value, "floatValue"));

export const stringResolver = (vars: Variables): Resolve<string> => cachedResolver(vars, (value) => str(value, "textValue"));
