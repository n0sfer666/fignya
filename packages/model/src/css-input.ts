import type { Color } from "./color";
import { round } from "./css-values";
import type { Sides } from "./style";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const RGB = /^rgba?\(([^)]*)\)$/i;

const DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)$/;

export const parseNumber = (input: string): number | undefined => {
  const trimmed = input.trim();
  const value = Number(trimmed);
  return DECIMAL.test(trimmed) && Number.isFinite(value) ? value : undefined;
};

export const parsePx = (input: string): number | undefined => parseNumber(input.trim().replace(/px$/i, ""));

const expandSides = (values: number[]): Sides | undefined => {
  const [top, right = top, bottom = top, left = right] = values;
  return top === undefined || right === undefined || bottom === undefined || left === undefined || values.length > 4 ? undefined : [top, right, bottom, left];
};

export const parseSides = (input: string): Sides | undefined => {
  const values = input.trim().split(/\s+/).map(parsePx);
  const numbers = values.filter((v) => v !== undefined);
  return numbers.length === values.length ? expandSides(numbers) : undefined;
};

const hexColor = (digits: string): Color => {
  const full = digits.length === 3 ? [...digits].map((d) => d + d).join("") : digits;
  const channel = (at: number): number => Number.parseInt(full.slice(at, at + 2), 16);
  return { r: channel(0), g: channel(2), b: channel(4), a: full.length === 8 ? round(channel(6) / 255, 3) : 1 };
};

const isByte = (value: number | undefined): value is number => value !== undefined && Number.isInteger(value) && value >= 0 && value <= 255;

const isAlpha = (value: number | undefined): value is number => value !== undefined && value >= 0 && value <= 1;

const rgbColor = (body: string): Color | undefined => {
  const parts = body.split(",").map(parseNumber);
  const [r, g, b, a = 1] = parts;
  if (parts.length > 4 || parts.some((p) => p === undefined)) return undefined;
  return isByte(r) && isByte(g) && isByte(b) && isAlpha(a) ? { r, g, b, a } : undefined;
};

export const parseColor = (input: string): Color | undefined => {
  const trimmed = input.trim();
  const hex = HEX.exec(trimmed)?.[1];
  if (hex) return hexColor(hex);
  const rgb = RGB.exec(trimmed)?.[1];
  return rgb === undefined ? undefined : rgbColor(rgb);
};
