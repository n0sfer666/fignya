import { num, rec, str, type Rec } from "../fig/guards";
import { firstSolid } from "./paint";

const WEIGHTS: [string, number][] = [
  ["extralight", 200], ["ultralight", 200], ["semibold", 600], ["demibold", 600], ["extrabold", 800],
  ["ultrabold", 800], ["thin", 100], ["light", 300], ["medium", 500], ["bold", 700], ["heavy", 800], ["black", 900],
];

const weightOf = (style: string): number => {
  const s = style.toLowerCase().replaceAll(" ", "");
  return WEIGHTS.find(([name]) => s.includes(name))?.[1] ?? 400;
};

const lineHeight = (raw: Rec, fontSize: number): string => {
  const lh = rec(raw, "lineHeight");
  const value = num(lh, "value") ?? 100;
  const units = str(lh, "units");
  if (units === "PIXELS") return `${value}px`;
  if (units === "PERCENT") return `${Number(((fontSize * value) / 100).toFixed(2))}px`;
  return "normal";
};

const letterSpacing = (raw: Rec): string => {
  const ls = rec(raw, "letterSpacing");
  const value = num(ls, "value") ?? 0;
  return str(ls, "units") === "PERCENT" ? `${Number((value / 100).toFixed(4))}em` : `${value}px`;
};

const ALIGN: Record<string, string> = { LEFT: "left", CENTER: "center", RIGHT: "right", JUSTIFIED: "justify" };

export const textCss = (raw: Rec): string[] => {
  const font = rec(raw, "fontName");
  const fontSize = num(raw, "fontSize") ?? 12;
  const style = str(font, "style") ?? "Regular";
  const css = [
    `font-family:'${str(font, "family") ?? "Inter"}',sans-serif`,
    `font-size:${fontSize}px`,
    `font-weight:${weightOf(style)}`,
    `line-height:${lineHeight(raw, fontSize)}`,
    `letter-spacing:${letterSpacing(raw)}`,
    `text-align:${ALIGN[str(raw, "textAlignHorizontal") ?? "LEFT"] ?? "left"}`,
    "white-space:pre-wrap",
    "overflow-wrap:break-word",
  ];
  if (style.toLowerCase().includes("italic")) css.push("font-style:italic");
  const color = firstSolid(raw, "fillPaints");
  if (color) css.push(`color:${color}`);
  return css;
};

export const textOf = (raw: Rec): string => str(rec(raw, "textData"), "characters") ?? "";
