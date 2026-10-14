import type { Edit } from "./edit";
import { boxOf, withBox } from "./edit-box";
import type { DesignNode, NodeId } from "./node";
import { STYLE_INPUTS, type StyleInput } from "./style-input";
import { isStylePatch } from "./style-patch-guard";

const STYLE_FIELDS = {
  width: STYLE_INPUTS.width,
  height: STYLE_INPUTS.height,
  opacity: STYLE_INPUTS.opacity,
  "background-color": STYLE_INPUTS.background,
  color: STYLE_INPUTS.color,
  gap: STYLE_INPUTS.gap,
  padding: STYLE_INPUTS.padding,
  "border-radius": STYLE_INPUTS.borderRadius,
  "font-size": STYLE_INPUTS.fontSize,
  "font-weight": STYLE_INPUTS.fontWeight,
} satisfies Record<string, StyleInput>;

type StyleField = keyof typeof STYLE_FIELDS;

export type EditField = StyleField | "text";

const isStyleField = (name: string): name is StyleField => Object.hasOwn(STYLE_FIELDS, name);

export const isEditField = (name: string): name is EditField => name === "text" || isStyleField(name);

export const fieldEdit = (field: EditField, input: string, node: DesignNode, target: NodeId[]): Edit | undefined => {
  if (field === "text") return node.kind === "text" ? { target, text: input } : undefined;
  const patch = STYLE_FIELDS[field](input);
  const style = isStylePatch(patch) ? withBox(patch, boxOf(node.style), target) : undefined;
  return isStylePatch(style) ? { target, style } : undefined;
};
