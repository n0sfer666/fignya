import type { LetterSpacing, Px, Style, TextAlign } from "@fignya/model";
import { num, rec, str, type Rec } from "../fig/guards";
import { firstSolid } from "./paint";

const WEIGHTS: [string, number][] = [
  ["extralight", 200], ["ultralight", 200], ["semibold", 600], ["demibold", 600], ["extrabold", 800],
  ["ultrabold", 800], ["thin", 100], ["light", 300], ["medium", 500], ["bold", 700], ["heavy", 800], ["black", 900],
];

const ALIGN: Record<string, TextAlign> = { LEFT: "left", CENTER: "center", RIGHT: "right", JUSTIFIED: "justify" };

const CASE: Readonly<Record<string, Style>> = {
  UPPER: { textTransform: "uppercase" },
  LOWER: { textTransform: "lowercase" },
  TITLE: { textTransform: "capitalize" },
  SMALL_CAPS: { fontVariantCaps: "small-caps" },
  SMALL_CAPS_FORCED: { fontVariantCaps: "all-small-caps" },
};

const DECORATION: Readonly<Record<string, Style>> = { UNDERLINE: { textDecoration: "underline" }, STRIKETHROUGH: { textDecoration: "line-through" } };

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

const maxLines = (raw: Rec, lh: Px | "normal"): number | undefined => {
  const lines = num(raw, "maxLines");
  if (lines !== undefined) return lines;
  const height = num(rec(raw, "size"), "y");
  return lh === "normal" || height === undefined ? undefined : Math.max(1, Math.floor(height / lh));
};

const wrapStyle = (raw: Rec, lh: Px | "normal"): Style => {
  const autoWidth = str(raw, "textAutoResize") === "WIDTH_AND_HEIGHT";
  if (autoWidth) return { whiteSpace: "pre" };
  const lines = str(raw, "textTruncation") === "ENDING" ? maxLines(raw, lh) : undefined;
  if (lines === undefined) return { whiteSpace: "pre-wrap", overflowWrap: "break-word" };
  const clip: Style = { overflow: "hidden", textOverflow: "ellipsis" };
  if (lines === 1 && num(raw, "textExplicitLayoutVersion") !== undefined) return { ...clip, whiteSpace: "pre" };
  return { ...clip, whiteSpace: "pre-line", overflowWrap: "break-word", display: "-webkit-box", lineClamp: lines };
};

export const textStyle = (raw: Rec): Style => {
  const font = rec(raw, "fontName");
  const fontSize = num(raw, "fontSize") ?? 12;
  const fontStyle = str(font, "style") ?? "Regular";
  const color = firstSolid(raw, "fillPaints");
  const lh = lineHeight(raw, fontSize);
  return {
    fontFamily: str(font, "family") ?? "Inter",
    fontSize,
    fontWeight: weightOf(fontStyle),
    ...(fontStyle.toLowerCase().includes("italic") ? { fontStyle: "italic" } : {}),
    lineHeight: lh,
    letterSpacing: letterSpacing(raw),
    textAlign: ALIGN[str(raw, "textAlignHorizontal") ?? "LEFT"] ?? "left",
    ...(color ? { color } : {}),
    ...CASE[str(raw, "textCase") ?? ""],
    ...DECORATION[str(raw, "textDecoration") ?? ""],
    ...wrapStyle(raw, lh),
  };
};

export const textOf = (raw: Rec): string => str(rec(raw, "textData"), "characters") ?? "";
