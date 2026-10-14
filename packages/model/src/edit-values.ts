import { px, rgba, sides } from "./css-values";
import { EDIT_KEYS, type EditKey } from "./edit";
import type { Style } from "./style";

type Format = (style: Style) => string | undefined;

const pxOf = (value: number | undefined): string | undefined => (value === undefined ? undefined : px(value));

const numberOf = (value: number | undefined): string | undefined => (value === undefined ? undefined : String(value));

const solidOf = ({ background }: Style): string | undefined => {
  const [paint] = background ?? [];
  return background?.length === 1 && paint?.kind === "solid" ? rgba(paint.color) : undefined;
};

const VALUE_FORMATS: Record<EditKey, Format> = {
  left: (style) => pxOf(style.left),
  top: (style) => pxOf(style.top),
  width: (style) => pxOf(style.width),
  height: (style) => pxOf(style.height),
  opacity: (style) => numberOf(style.opacity),
  background: solidOf,
  color: (style) => (style.color === undefined ? undefined : rgba(style.color)),
  gap: (style) => pxOf(style.gap),
  padding: (style) => (style.padding === undefined ? undefined : sides(style.padding)),
  borderRadius: (style) => (typeof style.borderRadius === "string" || style.borderRadius === undefined ? style.borderRadius : sides(style.borderRadius)),
  fontSize: (style) => pxOf(style.fontSize),
  fontWeight: (style) => numberOf(style.fontWeight),
};

export const editValues = (style: Style): Partial<Record<EditKey, string>> =>
  Object.fromEntries(EDIT_KEYS.flatMap((key) => {
    const value = VALUE_FORMATS[key](style);
    return value === undefined ? [] : [[key, value]];
  }));
