import type { StylePatch } from "./edit";
import type { NodeId } from "./node";
import type { Style } from "./style";

const BOX_KEYS = ["left", "top", "width", "height"] as const;

const size = (value: number | undefined): number | undefined => (value === undefined ? undefined : Math.max(0, value));

export const boxOf = (style: Style): StylePatch => {
  const { left, top } = style;
  const [width, height] = [size(style.width), size(style.height)];
  return { ...(left === undefined ? {} : { left }), ...(top === undefined ? {} : { top }), ...(width === undefined ? {} : { width }), ...(height === undefined ? {} : { height }) };
};

export const touchesBox = (patch: StylePatch): boolean => BOX_KEYS.some((key) => patch[key] !== undefined);

export const withBox = (patch: StylePatch, box: StylePatch, target: readonly NodeId[]): StylePatch =>
  target.length > 1 && touchesBox(patch) ? { ...box, ...patch } : patch;
