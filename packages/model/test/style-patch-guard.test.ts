import { describe, expect, it } from "vitest";
import { isStylePatch } from "../src";

const red = { r: 255, g: 0, b: 0, a: 1 };

describe("isStylePatch", () => {
  it("accepts editable keys with values in range", () => {
    expect(isStylePatch({ width: 0, height: 4, left: -10, top: 3, gap: -2, opacity: 1, fontSize: 9, fontWeight: 700 })).toBe(true);
    expect(isStylePatch({ padding: [0, 1, 2, 3], borderRadius: "50%", color: red, background: [{ kind: "solid", color: red }] })).toBe(true);
  });

  it("rejects empty patches, arrays and unknown keys", () => {
    expect(isStylePatch({})).toBe(false);
    expect(isStylePatch([])).toBe(false);
    expect(isStylePatch(undefined)).toBe(false);
    expect(isStylePatch({ display: "flex" })).toBe(false);
  });

  it("rejects values out of range", () => {
    expect(isStylePatch({ width: -1 })).toBe(false);
    expect(isStylePatch({ height: Number.POSITIVE_INFINITY })).toBe(false);
    expect(isStylePatch({ opacity: 1.5 })).toBe(false);
    expect(isStylePatch({ fontSize: 0 })).toBe(false);
    expect(isStylePatch({ fontWeight: 1001 })).toBe(false);
    expect(isStylePatch({ padding: [-1, 0, 0, 0] })).toBe(false);
    expect(isStylePatch({ borderRadius: [0, 0, -2, 0] })).toBe(false);
    expect(isStylePatch({ color: { r: 256, g: 0, b: 0, a: 1 } })).toBe(false);
    expect(isStylePatch({ color: { r: 1.5, g: 0, b: 0, a: 1 } })).toBe(false);
    expect(isStylePatch({ color: { ...red, a: 2 } })).toBe(false);
    expect(isStylePatch({ background: [{ kind: "solid", color: red }, { kind: "solid", color: red }] })).toBe(false);
  });
});
