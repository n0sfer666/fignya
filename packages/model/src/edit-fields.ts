import { parseColor, parseNumber, parsePx, parseSides } from "./css-input";
import type { Edit, StylePatch } from "./edit";
import type { DesignNode, NodeId } from "./node";
import { isStylePatch } from "./style-patch-guard";

type Parse = (input: string) => StylePatch | undefined;

const patchOf = <TValue>(value: TValue | undefined, patch: (value: TValue) => StylePatch): StylePatch | undefined =>
  value === undefined ? undefined : patch(value);

const STYLE_FIELDS = {
  width: (input) => patchOf(parsePx(input), (width) => ({ width })),
  height: (input) => patchOf(parsePx(input), (height) => ({ height })),
  opacity: (input) => patchOf(parseNumber(input), (opacity) => ({ opacity })),
  "background-color": (input) => patchOf(parseColor(input), (color) => ({ background: [{ kind: "solid", color }] })),
  color: (input) => patchOf(parseColor(input), (color) => ({ color })),
  gap: (input) => patchOf(parsePx(input), (gap) => ({ gap })),
  padding: (input) => patchOf(parseSides(input), (padding) => ({ padding })),
  "border-radius": (input) => (input.trim() === "50%" ? { borderRadius: "50%" } : patchOf(parseSides(input), (borderRadius) => ({ borderRadius }))),
  "font-size": (input) => patchOf(parsePx(input), (fontSize) => ({ fontSize })),
  "font-weight": (input) => patchOf(parseNumber(input), (fontWeight) => ({ fontWeight })),
} satisfies Record<string, Parse>;

type StyleField = keyof typeof STYLE_FIELDS;

export type EditField = StyleField | "text";

const isStyleField = (name: string): name is StyleField => Object.hasOwn(STYLE_FIELDS, name);

export const isEditField = (name: string): name is EditField => name === "text" || isStyleField(name);

const BOX_FIELDS: ReadonlySet<EditField> = new Set(["width", "height"]);

const size = (value: number | undefined): number | undefined => (value === undefined ? undefined : Math.max(0, value));

const boxOf = ({ style }: DesignNode): StylePatch => {
  const { left, top } = style;
  const [width, height] = [size(style.width), size(style.height)];
  return { ...(left === undefined ? {} : { left }), ...(top === undefined ? {} : { top }), ...(width === undefined ? {} : { width }), ...(height === undefined ? {} : { height }) };
};

const withBox = (field: EditField, patch: StylePatch, node: DesignNode, target: NodeId[]): StylePatch =>
  BOX_FIELDS.has(field) && target.length > 1 ? { ...boxOf(node), ...patch } : patch;

export const fieldEdit = (field: EditField, input: string, node: DesignNode, target: NodeId[]): Edit | undefined => {
  if (field === "text") return node.kind === "text" ? { target, text: input } : undefined;
  const patch = STYLE_FIELDS[field](input);
  const style = isStylePatch(patch) ? withBox(field, patch, node, target) : undefined;
  return isStylePatch(style) ? { target, style } : undefined;
};
