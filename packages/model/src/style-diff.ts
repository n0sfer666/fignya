import { isStyleKey } from "./css-text";
import { sameValue } from "./same-value";
import type { Style, StyleValues } from "./style";

export const styleDiff = (base: Style, next: Style): Style => {
  const diff: Style = {};
  const copy = <K extends keyof StyleValues>(key: K): void => {
    diff[key] = next[key];
  };
  for (const key in base) if (isStyleKey(key) && !sameValue(base[key], next[key])) copy(key);
  for (const key in next) if (isStyleKey(key) && !(key in base)) copy(key);
  return diff;
};
