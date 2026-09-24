import { describe, expect, it } from "vitest";
import { decorationStyle } from "../src/convert/decoration";
import { solid } from "./fixtures";

const black = { r: 0, g: 0, b: 0, a: 1 };

describe("decorationStyle", () => {
  it("is empty for a plain rectangle", () => {
    expect(decorationStyle({}, "ROUNDED_RECTANGLE", false)).toEqual({});
  });

  it("makes ellipses round", () => {
    expect(decorationStyle({}, "ELLIPSE", false)).toEqual({ borderRadius: "50%" });
  });

  it("uses per-corner radius over uniform", () => {
    expect(decorationStyle({ cornerRadius: 8, rectangleBottomLeftCornerRadius: 0 }, "FRAME", false).borderRadius).toEqual([8, 8, 8, 0]);
  });

  it("maps shadows and blurs", () => {
    const effects = [
      { type: "DROP_SHADOW", radius: 8, spread: 1, offset: { x: 0, y: 4 }, color: { r: 0, g: 0, b: 0, a: 0.5 } },
      { type: "INNER_SHADOW", radius: 2, offset: { x: 1, y: 1 }, color: { r: 0, g: 0, b: 0, a: 1 } },
      { type: "LAYER_BLUR", radius: 10 },
      { type: "BACKGROUND_BLUR", radius: 4 },
      { type: "DROP_SHADOW", radius: 99, visible: false },
    ];
    expect(decorationStyle({ effects, frameMaskDisabled: true }, "FRAME", false)).toEqual({
      boxShadow: [
        { inset: false, x: 0, y: 4, blur: 8, spread: 1, color: { r: 0, g: 0, b: 0, a: 0.5 } },
        { inset: true, x: 1, y: 1, blur: 2, spread: 0, color: black },
      ],
      filterBlur: 5,
      backdropBlur: 2,
    });
  });

  it("draws inside stroke as first inset shadow", () => {
    const style = decorationStyle({ strokePaints: [solid(0, 0, 0)], strokeWeight: 2 }, "ROUNDED_RECTANGLE", false);
    expect(style.boxShadow).toEqual([{ inset: true, x: 0, y: 0, blur: 0, spread: 2, color: black }]);
  });

  it("draws outside stroke as outline", () => {
    const style = decorationStyle({ strokePaints: [solid(0, 0, 0)], strokeWeight: 1, strokeAlign: "OUTSIDE" }, "ROUNDED_RECTANGLE", false);
    expect(style).toEqual({ outline: { width: 1, color: black } });
  });

  it("ignores stroke on vectors", () => {
    expect(decorationStyle({ strokePaints: [solid(0, 0, 0)], strokeWeight: 1 }, "VECTOR", true)).toEqual({});
  });

  it("keeps opacity below one and clips containers", () => {
    expect(decorationStyle({ opacity: 0.5 }, "INSTANCE", false)).toEqual({ opacity: 0.5, overflow: "hidden" });
  });
});
