import type { LetterSpacing, Px, Style, TextAlign } from "@fignya/model";
import { num, rec, str, type Rec } from "../fig/guards";
import { firstSolid } from "./paint";

const WEIGHTS: [string, number][] = [
  ["extralight", 200], ["ultralight", 200], ["semibold", 600], ["demibold", 600], ["extrabold", 800],
  ["ultrabold", 800], ["thin", 100], ["light", 300], ["medium", 500], ["bold", 700], ["heavy", 800], ["black", 900],
];

const ALIGN: Record<string, TextAlign> = { LEFT: "left", CENTER: "center", RIGHT: "right", JUSTIFIED: "justify" };

const weightOf = (style: string): number => {
  const s = style.toLowerCase().replaceAll(" ", "");
  return WEIGHTS.find(([name]) => s.includes(name))?.[1] ?? 400;
};

const lineHeight = (raw: Rec, fontSize: number): Px | "normal" => {
  const lh = rec(raw, "lineHeight");
  const value = num(lh, "value") ?? 100;
  const units = str(lh, "units");
  if (units === "PIXELS") return value;
  if (units === "PERCENT") return Number(((fontSize * value) / 100).toFixed(2));
  return "normal";
};

const letterSpacing = (raw: Rec): LetterSpacing => {
  const ls = rec(raw, "letterSpacing");
  const value = num(ls, "value") ?? 0;
  return str(ls, "units") === "PERCENT" ? { value: Number((value / 100).toFixed(4)), unit: "em" } : { value, unit: "px" };
};

export const textStyle = (raw: Rec): Style => {
  const font = rec(raw, "fontName");
  const fontSize = num(raw, "fontSize") ?? 12;
  const fontStyle = str(font, "style") ?? "Regular";
  const color = firstSolid(raw, "fillPaints");
  return {
    fontFamily: str(font, "family") ?? "Inter",
    fontSize,
    fontWeight: weightOf(fontStyle),
    ...(fontStyle.toLowerCase().includes("italic") ? { fontStyle: "italic" } : {}),
    lineHeight: lineHeight(raw, fontSize),
    letterSpacing: letterSpacing(raw),
    textAlign: ALIGN[str(raw, "textAlignHorizontal") ?? "LEFT"] ?? "left",
    ...(color ? { color } : {}),
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  };
};

export const textOf = (raw: Rec): string => str(rec(raw, "textData"), "characters") ?? "";
