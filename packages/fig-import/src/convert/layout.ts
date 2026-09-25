import type { FlexAlign, Matrix2, Style } from "@fignya/model";
import { num, rec, str, type Rec } from "../fig/guards";

const JUSTIFY: Record<string, FlexAlign | "space-between"> = { MIN: "flex-start", CENTER: "center", MAX: "flex-end", SPACE_BETWEEN: "space-between" };
const ALIGN: Record<string, FlexAlign | "baseline"> = { MIN: "flex-start", CENTER: "center", MAX: "flex-end", BASELINE: "baseline" };

export const isFlex = (raw: Rec): boolean => {
  const mode = str(raw, "stackMode");
  return mode === "HORIZONTAL" || mode === "VERTICAL";
};

export const containerStyle = (raw: Rec): Style => {
  if (!isFlex(raw)) return {};
  const h = num(raw, "stackHorizontalPadding") ?? 0;
  const v = num(raw, "stackVerticalPadding") ?? 0;
  const style: Style = {
    display: "flex",
    flexDirection: str(raw, "stackMode") === "HORIZONTAL" ? "row" : "column",
    gap: Math.max(0, num(raw, "stackSpacing") ?? 0),
    padding: [v, num(raw, "stackPaddingRight") ?? h, num(raw, "stackPaddingBottom") ?? v, h],
    justifyContent: JUSTIFY[str(raw, "stackPrimaryAlignItems") ?? "MIN"] ?? "flex-start",
    alignItems: ALIGN[str(raw, "stackCounterAlignItems") ?? "MIN"] ?? "flex-start",
  };
  return str(raw, "stackWrap") === "WRAP" ? { ...style, flexWrap: "wrap" } : style;
};

const rotation = (t: Rec | undefined): Matrix2 | undefined => {
  const m: Matrix2 = [num(t, "m00") ?? 1, num(t, "m10") ?? 0, num(t, "m01") ?? 0, num(t, "m11") ?? 1];
  return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 ? undefined : m;
};

const absoluteStyle = (raw: Rec, w: number, h: number): Style => {
  const t = rec(raw, "transform");
  const style: Style = { position: "absolute", left: num(t, "m02") ?? 0, top: num(t, "m12") ?? 0, width: w, height: h };
  const transform = rotation(t);
  return transform ? { ...style, transform } : style;
};

const fillStyle = (row: boolean, wrap: boolean, size: number): Style =>
  wrap ? { flexGrow: 1, flexShrink: 1, flexBasis: size } : { flexGrow: 1, flexShrink: 1, flexBasis: 0, ...(row ? { minWidth: 0 } : { minHeight: 0 }) };

const flowStyle = (raw: Rec, parent: Rec, w: number, h: number): Style => {
  const row = str(parent, "stackMode") === "HORIZONTAL";
  const grow = (num(raw, "stackChildPrimaryGrow") ?? 0) > 0;
  const stretch = str(raw, "stackChildAlignSelf") === "STRETCH";
  const main: Style = grow ? fillStyle(row, str(parent, "stackWrap") === "WRAP", row ? w : h) : row ? { width: w } : { height: h };
  const cross: Style = stretch ? { alignSelf: "stretch" } : row ? { height: h } : { width: w };
  return { position: "relative", flexShrink: 0, ...main, ...cross };
};

export const boxStyle = (raw: Rec, parent: Rec | undefined): Style => {
  const size = rec(raw, "size");
  const w = num(size, "x") ?? 0;
  const h = num(size, "y") ?? 0;
  const inFlow = parent !== undefined && isFlex(parent) && str(raw, "stackPositioning") !== "ABSOLUTE";
  return parent && inFlow ? flowStyle(raw, parent, w, h) : absoluteStyle(raw, w, h);
};
