import { describe, expect, it } from "vitest";
import { textOf, textStyle } from "../src/convert/text";
import { solid } from "./fixtures";

describe("textStyle", () => {
  it("defaults to Inter 12 regular", () => {
    expect(textStyle({})).toEqual({ fontFamily: "Inter", fontSize: 12, fontWeight: 400, lineHeight: "normal", letterSpacing: { value: 0, unit: "px" }, textAlign: "left", whiteSpace: "pre-wrap", overflowWrap: "break-word" });
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
