import type { Color, Shadow, Sides, Style } from "@fignya/model";
import { bool, num, rec, recs, str, type Rec } from "../fig/guards";
import { colorOf } from "./color";
import { firstSolid } from "./paint";

const CLIPPING = new Set(["FRAME", "INSTANCE", "SYMBOL"]);

const CORNERS = ["rectangleTopLeftCornerRadius", "rectangleTopRightCornerRadius", "rectangleBottomRightCornerRadius", "rectangleBottomLeftCornerRadius"];

const radius = (raw: Rec, type: string): Style => {
  if (type === "ELLIPSE") return { borderRadius: "50%" };
  const [a = 0, b = 0, c = 0, d = 0] = CORNERS.map((k) => num(raw, k) ?? num(raw, "cornerRadius") ?? 0);
  const sides: Sides = [a, b, c, d];
  return sides.every((s) => s === 0) ? {} : { borderRadius: sides };
};

const shadowOf = (effect: Rec, inset: boolean): Shadow => {
  const offset = rec(effect, "offset");
  return {
    inset,
    x: num(offset, "x") ?? 0,
    y: num(offset, "y") ?? 0,
    blur: num(effect, "radius") ?? 0,
    spread: num(effect, "spread") ?? 0,
    color: colorOf(rec(effect, "color")),
  };
};

const effectsStyle = (raw: Rec, strokeShadows: Shadow[]): Style => {
  const shadows: Shadow[] = [...strokeShadows];
  const style: Style = {};
  for (const e of recs(raw, "effects")) {
    if (bool(e, "visible") === false) continue;
    const type = str(e, "type");
    const blur = (num(e, "radius") ?? 0) / 2;
    if (type === "DROP_SHADOW" || type === "INNER_SHADOW") shadows.push(shadowOf(e, type === "INNER_SHADOW"));
    if (type === "FOREGROUND_BLUR" || type === "LAYER_BLUR") style.filterBlur = blur;
    if (type === "BACKGROUND_BLUR") style.backdropBlur = blur;
  }
  return shadows.length > 0 ? { boxShadow: shadows, ...style } : style;
};

const SIDES: [string, number, number][] = [
  ["borderTopWeight", 0, 1],
  ["borderRightWeight", -1, 0],
  ["borderBottomWeight", 0, -1],
  ["borderLeftWeight", 1, 0],
];

const sideShadows = (raw: Rec, color: Color): Shadow[] => {
  const inset = str(raw, "strokeAlign") !== "OUTSIDE";
  const sign = inset ? 1 : -1;
  return SIDES.flatMap(([key, x, y]) => {
    const width = num(raw, key) ?? 0;
    return width > 0 ? [{ inset, x: sign * x * width || 0, y: sign * y * width || 0, blur: 0, spread: 0, color }] : [];
  });
};

const strokeStyle = (raw: Rec): { shadows: Shadow[]; style: Style } => {
  const color = firstSolid(raw, "strokePaints");
  if (!color) return { shadows: [], style: {} };
  if (bool(raw, "borderStrokeWeightsIndependent") === true) return { shadows: sideShadows(raw, color), style: {} };
  const width = num(raw, "strokeWeight") ?? 0;
  if (width <= 0) return { shadows: [], style: {} };
  if (str(raw, "strokeAlign") === "OUTSIDE") return { shadows: [], style: { outline: { width, color } } };
  return { shadows: [{ inset: true, x: 0, y: 0, blur: 0, spread: width, color }], style: {} };
};

export const decorationStyle = (raw: Rec, type: string, isVector: boolean): Style => {
  const stroke = isVector ? { shadows: [], style: {} } : strokeStyle(raw);
  const opacity = num(raw, "opacity") ?? 1;
  const clips = CLIPPING.has(type) && bool(raw, "frameMaskDisabled") !== true;
  return {
    ...radius(raw, type),
    ...stroke.style,
    ...effectsStyle(raw, stroke.shadows),
    ...(opacity < 1 ? { opacity: Number(opacity.toFixed(3)) } : {}),
    ...(clips ? { overflow: "hidden" } : {}),
  };
};
