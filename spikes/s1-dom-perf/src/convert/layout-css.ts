import { num, rec, str, type Rec } from "../fig/guards";

const px = (v: number): string => `${Number(v.toFixed(2))}px`;

const JUSTIFY: Record<string, string> = { MIN: "flex-start", CENTER: "center", MAX: "flex-end", SPACE_BETWEEN: "space-between" };
const ALIGN: Record<string, string> = { MIN: "flex-start", CENTER: "center", MAX: "flex-end", BASELINE: "baseline" };

export const isFlex = (raw: Rec): boolean => {
  const mode = str(raw, "stackMode");
  return mode === "HORIZONTAL" || mode === "VERTICAL";
};

export const containerCss = (raw: Rec): string[] => {
  if (!isFlex(raw)) return [];
  const h = num(raw, "stackHorizontalPadding") ?? 0;
  const v = num(raw, "stackVerticalPadding") ?? 0;
  const padding = [v, num(raw, "stackPaddingRight") ?? h, num(raw, "stackPaddingBottom") ?? v, h].map(px).join(" ");
  const css = [
    "display:flex",
    `flex-direction:${str(raw, "stackMode") === "HORIZONTAL" ? "row" : "column"}`,
    `gap:${px(Math.max(0, num(raw, "stackSpacing") ?? 0))}`,
    `padding:${padding}`,
    `justify-content:${JUSTIFY[str(raw, "stackPrimaryAlignItems") ?? "MIN"] ?? "flex-start"}`,
    `align-items:${ALIGN[str(raw, "stackCounterAlignItems") ?? "MIN"] ?? "flex-start"}`,
  ];
  if (str(raw, "stackWrap") === "WRAP") css.push("flex-wrap:wrap");
  return css;
};

const rotation = (t: Rec | undefined): string[] => {
  const a = num(t, "m00") ?? 1;
  const b = num(t, "m10") ?? 0;
  const c = num(t, "m01") ?? 0;
  const d = num(t, "m11") ?? 1;
  if (a === 1 && b === 0 && c === 0 && d === 1) return [];
  return [`transform:matrix(${[a, b, c, d].map((n) => Number(n.toFixed(4))).join(",")},0,0)`, "transform-origin:0 0"];
};

export const boxCss = (raw: Rec, parent: Rec | undefined, isRoot: boolean): string[] => {
  const size = rec(raw, "size");
  const w = num(size, "x") ?? 0;
  const h = num(size, "y") ?? 0;
  const t = rec(raw, "transform");
  const inFlow = parent !== undefined && isFlex(parent) && str(raw, "stackPositioning") !== "ABSOLUTE";
  if (isRoot) return ["position:relative", `width:${px(w)}`, `height:${px(h)}`];
  if (!inFlow) {
    return ["position:absolute", `left:${px(num(t, "m02") ?? 0)}`, `top:${px(num(t, "m12") ?? 0)}`, `width:${px(w)}`, `height:${px(h)}`, ...rotation(t)];
  }
  const row = str(parent, "stackMode") === "HORIZONTAL";
  const grow = (num(raw, "stackChildPrimaryGrow") ?? 0) > 0;
  const stretch = str(raw, "stackChildAlignSelf") === "STRETCH";
  const css = ["position:relative", "flex-shrink:0"];
  if (grow) css.push("flex-grow:1", row ? "min-width:0" : "min-height:0");
  else css.push(`${row ? "width" : "height"}:${px(row ? w : h)}`);
  if (stretch) css.push("align-self:stretch");
  else css.push(`${row ? "height" : "width"}:${px(row ? h : w)}`);
  return css;
};
