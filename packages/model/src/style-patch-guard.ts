import { EDIT_KEYS, type EditKey, type StylePatch } from "./edit";

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null && !Array.isArray(value);

const inRange = (min: number, max = Infinity) => (value: unknown): boolean =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const anyNumber = inRange(-Infinity);

const nonNegative = inRange(0);

const isByte = (value: unknown): boolean => Number.isInteger(value) && inRange(0, 255)(value);

const isSides = (value: unknown): boolean => Array.isArray(value) && value.length === 4 && value.every(nonNegative);

const isColor = (value: unknown): boolean => isFields(value) && [value.r, value.g, value.b].every(isByte) && inRange(0, 1)(value.a);

const isSolid = (value: unknown): boolean => isFields(value) && value.kind === "solid" && isColor(value.color);

const VALUE_CHECKS: Record<EditKey, (value: unknown) => boolean> = {
  left: anyNumber,
  top: anyNumber,
  width: nonNegative,
  height: nonNegative,
  opacity: inRange(0, 1),
  gap: anyNumber,
  fontSize: inRange(Number.MIN_VALUE),
  fontWeight: inRange(1, 1000),
  color: isColor,
  padding: isSides,
  borderRadius: (value) => value === "50%" || isSides(value),
  background: (value) => Array.isArray(value) && value.length === 1 && value.every(isSolid),
};

const isEditKey = (key: string): key is EditKey => EDIT_KEYS.some((k) => k === key);

export const isStylePatch = (value: unknown): value is StylePatch => {
  const entries = isFields(value) ? Object.entries(value) : [];
  return entries.length > 0 && entries.every(([key, field]) => isEditKey(key) && VALUE_CHECKS[key](field));
};
