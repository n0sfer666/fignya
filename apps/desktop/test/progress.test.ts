import { describe, expect, it } from "vitest";
import { progressPercent } from "../shared/progress";

describe("progressPercent", () => {
  it("maps decode to the first half and convert to the second", () => {
    expect(progressPercent({ phase: "decode", done: 0, total: 100 })).toBe(0);
    expect(progressPercent({ phase: "decode", done: 50, total: 100 })).toBe(25);
    expect(progressPercent({ phase: "convert", done: 0, total: 100 })).toBe(50);
    expect(progressPercent({ phase: "convert", done: 100, total: 100 })).toBe(100);
  });

  it("treats an empty phase as complete", () => {
    expect(progressPercent({ phase: "decode", done: 0, total: 0 })).toBe(50);
  });
});
