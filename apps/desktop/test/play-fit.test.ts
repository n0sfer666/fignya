import { describe, expect, it } from "vitest";
import { fitScale } from "../renderer/src/play/play-fit";

describe("fitScale", () => {
  it("shrinks a wide screen to the width and never enlarges", () => {
    expect(fitScale(1440, 720)).toBe(0.5);
    expect(fitScale(375, 1200)).toBe(1);
  });

  it("keeps the natural size without a measurable width", () => {
    expect(fitScale(1440, 0)).toBe(1);
    expect(fitScale(0, 800)).toBe(1);
  });
});
