import { bool, num, rec, recs, str, type Rec } from "../fig/guards";
import { firstSolid, rgba } from "./paint";

const CLIPPING = new Set(["FRAME", "INSTANCE", "SYMBOL"]);

const radius = (raw: Rec, type: string): string[] => {
  if (type === "ELLIPSE") return ["border-radius:50%"];
  const corners = ["rectangleTopLeftCornerRadius", "rectangleTopRightCornerRadius", "rectangleBottomRightCornerRadius", "rectangleBottomLeftCornerRadius"].map(
    (k) => num(raw, k) ?? num(raw, "cornerRadius") ?? 0,
  );
  if (corners.every((c) => c === 0)) return [];
  return [`border-radius:${corners.map((c) => `${c}px`).join(" ")}`];
};

const effectShadows = (raw: Rec): { shadows: string[]; filters: string[] } => {
  const shadows: string[] = [];
  const filters: string[] = [];
  for (const e of recs(raw, "effects")) {
    if (bool(e, "visible") === false) continue;
    const type = str(e, "type");
    const r = num(e, "radius") ?? 0;
    const offset = rec(e, "offset");
    const shadow = `${num(offset, "x") ?? 0}px ${num(offset, "y") ?? 0}px ${r}px ${num(e, "spread") ?? 0}px ${rgba(rec(e, "color"))}`;
    if (type === "DROP_SHADOW") shadows.push(shadow);
    if (type === "INNER_SHADOW") shadows.push(`inset ${shadow}`);
    if (type === "FOREGROUND_BLUR" || type === "LAYER_BLUR") filters.push(`filter:blur(${r / 2}px)`);
    if (type === "BACKGROUND_BLUR") filters.push(`backdrop-filter:blur(${r / 2}px)`);
  }
  return { shadows, filters };
};

const stroke = (raw: Rec): { shadow?: string; outline?: string } => {
  const color = firstSolid(raw, "strokePaints");
  const weight = num(raw, "strokeWeight") ?? 0;
  if (!color || weight <= 0) return {};
  if (str(raw, "strokeAlign") === "OUTSIDE") return { outline: `outline:${weight}px solid ${color}` };
  return { shadow: `inset 0 0 0 ${weight}px ${color}` };
};

export const decorationCss = (raw: Rec, type: string, isVector: boolean): string[] => {
  const css = [...radius(raw, type)];
  const { shadows, filters } = effectShadows(raw);
  const s = isVector ? {} : stroke(raw);
  if (s.shadow) shadows.unshift(s.shadow);
  if (s.outline) css.push(s.outline);
  if (shadows.length > 0) css.push(`box-shadow:${shadows.join(",")}`);
  css.push(...filters);
  const opacity = num(raw, "opacity") ?? 1;
  if (opacity < 1) css.push(`opacity:${Number(opacity.toFixed(3))}`);
  if (CLIPPING.has(type) && bool(raw, "frameMaskDisabled") !== true) css.push("overflow:hidden");
  return css;
};
