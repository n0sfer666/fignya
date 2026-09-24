import type { Color } from "./color";
import type { Shadow, Sides } from "./style";

export type ImageUrl = (hash: string) => string;

export type Declaration = readonly [string, string];

export const round = (value: number, digits: number): number => Number(value.toFixed(digits));

export const px = (value: number): string => `${round(value, 2)}px`;

export const sides = (value: Sides): string => value.map(px).join(" ");

export const rgba = (c: Color): string => `rgba(${c.r},${c.g},${c.b},${round(c.a, 3)})`;

export const shadow = (s: Shadow): string =>
  `${s.inset ? "inset " : ""}${px(s.x)} ${px(s.y)} ${px(s.blur)} ${px(s.spread)} ${rgba(s.color)}`;

export const quoted = (value: string): string =>
  `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll(/[\n\r\f]/g, " ")}'`;
