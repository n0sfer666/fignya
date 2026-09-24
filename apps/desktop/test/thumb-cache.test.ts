import { describe, expect, it } from "vitest";
import { cacheKey, thumbPath } from "../main/thumb-cache";
import { thumbScale } from "../main/thumb-scale";

describe("thumb cache", () => {
  it("changes key when the file or the renderer changes", () => {
    const key = cacheKey("/a.fig", 10, 1, "r1");
    expect(key).toHaveLength(16);
    expect(cacheKey("/a.fig", 10, 1, "r1")).toBe(key);
    expect(cacheKey("/a.fig", 11, 1, "r1")).not.toBe(key);
    expect(cacheKey("/a.fig", 10, 2, "r1")).not.toBe(key);
    expect(cacheKey("/a.fig", 10, 1, "r2")).not.toBe(key);
  });

  it("stores screens under filesystem-safe names and rejects other ids", () => {
    expect(thumbPath("/cache", "12:34")).toBe("/cache/12-34.png");
    expect(thumbPath("/cache", "../../x")).toBeUndefined();
    expect(thumbPath("/cache", "1:2/x")).toBeUndefined();
  });

  it("caps scale by longest side", () => {
    expect(thumbScale(375, 800)).toBe(0.5);
    expect(thumbScale(375, 16384)).toBe(0.25);
  });
});
