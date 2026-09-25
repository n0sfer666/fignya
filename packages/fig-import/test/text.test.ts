import { describe, expect, it } from "vitest";
import { textOf, textStyle } from "../src/convert/text";
import { solid } from "./fixtures";

describe("textStyle", () => {
  it("defaults to Inter 12 regular", () => {
    expect(textStyle({})).toEqual({ fontFamily: "Inter", fontSize: 12, fontWeight: 400, lineHeight: "normal", letterSpacing: { value: 0, unit: "px" }, textAlign: "left", whiteSpace: "pre-wrap", overflowWrap: "break-word" });
  });

  it("maps text case and decoration", () => {
    expect(textStyle({ textCase: "UPPER", textDecoration: "UNDERLINE" })).toMatchObject({ textTransform: "uppercase", textDecoration: "underline" });
    expect(textStyle({ textCase: "TITLE", textDecoration: "STRIKETHROUGH" })).toMatchObject({ textTransform: "capitalize", textDecoration: "line-through" });
    expect(textStyle({ textCase: "ORIGINAL", textDecoration: "NONE" })).not.toHaveProperty("textTransform");
    expect(textStyle({ textCase: "SMALL_CAPS" })).toMatchObject({ fontVariantCaps: "small-caps" });
    expect(textStyle({ textCase: "SMALL_CAPS_FORCED" })).toMatchObject({ fontVariantCaps: "all-small-caps" });
  });

  it("maps font, spacing, alignment and color", () => {
    expect(
      textStyle({
        fontName: { family: "Roboto", style: "Semi Bold Italic" },
        fontSize: 20,
        lineHeight: { value: 150, units: "PERCENT" },
        letterSpacing: { value: -2, units: "PERCENT" },
        textAlignHorizontal: "CENTER",
        fillPaints: [solid(1, 0, 0)],
      }),
    ).toEqual({
      fontFamily: "Roboto",
      fontSize: 20,
      fontWeight: 600,
      fontStyle: "italic",
      lineHeight: 30,
      letterSpacing: { value: -0.02, unit: "em" },
      textAlign: "center",
      color: { r: 255, g: 0, b: 0, a: 1 },
      whiteSpace: "pre-wrap",
      overflowWrap: "break-word",
    });
  });

  it("ignores stale truncation on auto-width text", () => {
    expect(textStyle({ textAutoResize: "WIDTH_AND_HEIGHT", textTruncation: "ENDING", maxLines: 2 })).toMatchObject({ whiteSpace: "pre" });
    expect(textStyle({ textAutoResize: "WIDTH_AND_HEIGHT", textTruncation: "ENDING" }).textOverflow).toBeUndefined();
  });

  it("derives max lines of truncated fixed box from its height", () => {
    const raw = { textTruncation: "ENDING", lineHeight: { value: 20, units: "PIXELS" } };
    expect(textStyle({ ...raw, size: { x: 100, y: 45 } })).toMatchObject({ display: "-webkit-box", lineClamp: 2, textOverflow: "ellipsis" });
    expect(textStyle({ ...raw, size: { x: 100, y: 20 } })).toMatchObject({ whiteSpace: "pre", textOverflow: "ellipsis" });
  });

  it("keeps auto-width text on one line", () => {
    const style = textStyle({ textAutoResize: "WIDTH_AND_HEIGHT" });
    expect(style.whiteSpace).toBe("pre");
    expect(style.overflowWrap).toBeUndefined();
  });

  it("wraps fixed-width text", () => {
    expect(textStyle({ textAutoResize: "HEIGHT" })).toMatchObject({ whiteSpace: "pre-wrap", overflowWrap: "break-word" });
  });

  it("ellipsizes truncated single line", () => {
    const style = textStyle({ textAutoResize: "HEIGHT", textTruncation: "ENDING", maxLines: 1 });
    expect(style).toMatchObject({ whiteSpace: "pre", overflow: "hidden", textOverflow: "ellipsis" });
    expect(style.lineClamp).toBeUndefined();
  });

  it("clamps truncated text to max lines", () => {
    expect(textStyle({ textAutoResize: "HEIGHT", textTruncation: "ENDING", maxLines: 2 })).toMatchObject({ whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", lineClamp: 2 });
  });

  it("keeps pixel line height", () => {
    expect(textStyle({ lineHeight: { value: 18, units: "PIXELS" } }).lineHeight).toBe(18);
  });
});

describe("textOf", () => {
  it("reads characters", () => {
    expect(textOf({ textData: { characters: "Hi" } })).toBe("Hi");
    expect(textOf({})).toBe("");
  });
});
