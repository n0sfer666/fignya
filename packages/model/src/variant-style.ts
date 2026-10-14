import { isStyleKey } from "./css-text";
import { sameValue } from "./same-value";
import type { Style, StyleValues } from "./style";

const BOX_KEYS: ReadonlySet<keyof StyleValues> = new Set<keyof StyleValues>([
  "position",
  "left",
  "top",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "transform",
  "centerTransform",
  "scale",
  "contentSize",
  "margin",
  "alignSelf",
  "flexGrow",
  "flexShrink",
  "flexBasis",
]);

export const variantStylePatch = (current: Style, from: Style, to: Style): Style => {
  const patch: Style = {};
  const take = <K extends keyof StyleValues>(key: K): void => {
    if (!BOX_KEYS.has(key) && sameValue(current[key], from[key]) && !sameValue(from[key], to[key])) patch[key] = to[key];
  };
  for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) if (isStyleKey(key)) take(key);
  return patch;
};
