import type { Constraint, DesignNode, Style } from "@fignya/model";

export type Size = readonly [number, number];

export type Resize = { from: Size; to: Size; factor: Size };

const IDENTITY: Size = [1, 1];

const BOX_KEYS: ReadonlyArray<"left" | "top" | "width" | "height"> = ["left", "top", "width", "height"];

export const sizeOf = (style: Style): Size | undefined =>
  style.width === undefined || style.height === undefined ? undefined : [style.width, style.height];

const ratio = (value: number, base: number): number => (base > 0 ? value / base : 1);

export const same = (a: Size, b: Size): boolean => a[0] === b[0] && a[1] === b[1];

const spanOf = (constraint: Constraint, span: Size, from: number, to: number, fixed: boolean): Size => {
  const [start, size] = span;
  const delta = to - from;
  if (constraint === "max") return [start + delta, size];
  if (constraint === "center") return [start + delta / 2, size];
  if (constraint === "stretch") return [start, fixed ? size : size + delta];
  if (constraint === "scale") return [start * ratio(to, from), fixed ? size : size * ratio(to, from)];
  return span;
};

const scaledContent = (from: Size, to: Size, factor: Size): Resize | undefined => {
  const scaled: Size = [factor[0] * ratio(to[0], from[0]), factor[1] * ratio(to[1], from[1])];
  return same(scaled, IDENTITY) ? undefined : { from, to: from, factor: scaled };
};

export const resizeOf = (design: Style, final: Style, inherited: Resize | undefined, scale: boolean): Resize | undefined => {
  const factor = inherited?.factor ?? IDENTITY;
  const from = sizeOf(design);
  const size = sizeOf(final);
  const unchanged = same(factor, IDENTITY);
  if (!from || !size) return unchanged ? undefined : { from: IDENTITY, to: IDENTITY, factor };
  const to: Size = [ratio(size[0], factor[0]), ratio(size[1], factor[1])];
  if (scale) return scaledContent(from, to, factor);
  return unchanged && same(from, to) ? undefined : { from, to, factor };
};

export const hasOwnBox = (style: Style | undefined): boolean => BOX_KEYS.some((key) => style?.[key] !== undefined);

const isPlaced = (style: Style): boolean => style.position === "absolute" && BOX_KEYS.every((key) => style[key] !== undefined);

const hasOwnSize = (style: Style | undefined): boolean => style?.width !== undefined && style.height !== undefined;

export const carriesResize = (style: Style, own: Style | undefined): boolean => isPlaced(style) && (!hasOwnBox(own) || hasOwnSize(own));

export const constrainedStyle = (node: DesignNode, resize: Resize): Style => {
  const { style } = node;
  const { left, top, width, height } = style;
  if (style.position !== "absolute" || left === undefined || top === undefined || width === undefined || height === undefined) return style;
  const [horizontal, vertical] = node.constraints ?? ["min", "min"];
  const fixed = style.transform !== undefined || style.scale !== undefined;
  const [x, w] = spanOf(horizontal, [left, width], resize.from[0], resize.to[0], fixed);
  const [y, h] = spanOf(vertical, [top, height], resize.from[1], resize.to[1], fixed);
  const [kx, ky] = resize.factor;
  return { ...style, left: x * kx, top: y * ky, width: w * kx, height: h * ky };
};
