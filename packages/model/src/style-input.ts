import { parseColor, parseNumber, parsePx, parseSides } from "./css-input";
import type { EditKey, StylePatch } from "./edit";

export type StyleInput = (input: string) => StylePatch | undefined;

const patchOf = <TValue>(value: TValue | undefined, patch: (value: TValue) => StylePatch): StylePatch | undefined =>
  value === undefined ? undefined : patch(value);

export const STYLE_INPUTS: Record<EditKey, StyleInput> = {
  left: (input) => patchOf(parsePx(input), (left) => ({ left })),
  top: (input) => patchOf(parsePx(input), (top) => ({ top })),
  width: (input) => patchOf(parsePx(input), (width) => ({ width })),
  height: (input) => patchOf(parsePx(input), (height) => ({ height })),
  opacity: (input) => patchOf(parseNumber(input), (opacity) => ({ opacity })),
  background: (input) => patchOf(parseColor(input), (color) => ({ background: [{ kind: "solid", color }] })),
  color: (input) => patchOf(parseColor(input), (color) => ({ color })),
  gap: (input) => patchOf(parsePx(input), (gap) => ({ gap })),
  padding: (input) => patchOf(parseSides(input), (padding) => ({ padding })),
  borderRadius: (input) => (input.trim() === "50%" ? { borderRadius: "50%" } : patchOf(parseSides(input), (borderRadius) => ({ borderRadius }))),
  fontSize: (input) => patchOf(parsePx(input), (fontSize) => ({ fontSize })),
  fontWeight: (input) => patchOf(parseNumber(input), (fontWeight) => ({ fontWeight })),
};
