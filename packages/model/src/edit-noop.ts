import type { Edit } from "./edit";
import type { DesignNode } from "./node";
import { sameValue } from "./same-value";

export const isNoopEdit = ({ style = {}, text }: Edit, node: DesignNode): boolean => {
  const current = new Map<string, unknown>(Object.entries(node.style));
  const sameStyle = Object.entries(style).every(([key, value]) => sameValue(value, current.get(key)));
  return sameStyle && (text === undefined || (node.kind === "text" && node.text === text));
};
