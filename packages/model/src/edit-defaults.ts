import type { Declaration } from "./css-values";
import type { DesignNode } from "./node";

const hasBox = (node: DesignNode): boolean => node.kind !== "text" && node.kind !== "vector";

const isFilled = (node: DesignNode): boolean => (node.style.background?.length ?? 0) > 0;

export const editDefaults = (node: DesignNode): Declaration[] => {
  const { style } = node;
  const defaults: Declaration[] = [];
  if (style.display === "flex" && style.gap === undefined) defaults.push(["gap", "0px"]);
  if (style.display === "flex" && style.padding === undefined) defaults.push(["padding", "0px 0px 0px 0px"]);
  if (style.opacity === undefined) defaults.push(["opacity", "1"]);
  if (hasBox(node) && style.borderRadius === undefined) defaults.push(["border-radius", "0px"]);
  if (hasBox(node) && !isFilled(node)) defaults.push(["background-color", ""]);
  if (node.kind === "text" && style.fontWeight === undefined) defaults.push(["font-weight", "400"]);
  return defaults;
};
