import { describe, expect, it } from "vitest";
import { DOUBLE_CLICK_MS, isDoubleClick } from "../renderer/src/canvas/double-click";

describe("isDoubleClick", () => {
  const first = { time: 1000, x: 10, y: 10 };

  it("needs a previous click", () => {
    expect(isDoubleClick(undefined, first, 4)).toBe(false);
  });

  it("accepts a second click in time and in place", () => {
    expect(isDoubleClick(first, { time: 1000 + DOUBLE_CLICK_MS, x: 13, y: 10 }, 4)).toBe(true);
  });

  it("rejects a late or distant second click", () => {
    expect(isDoubleClick(first, { time: 1001 + DOUBLE_CLICK_MS, x: 10, y: 10 }, 4)).toBe(false);
    expect(isDoubleClick(first, { time: 1100, x: 15, y: 10 }, 4)).toBe(false);
  });
});
