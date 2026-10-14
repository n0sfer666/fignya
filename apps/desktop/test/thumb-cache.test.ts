import { describe, expect, it } from "vitest";
import { cacheKey, fontKey, thumbPath } from "../main/thumb-cache";
import { effectiveTier, thumbScale } from "../main/thumb-scale";

describe("thumb cache", () => {
  it("changes key when the file or the renderer changes", () => {
    const key = cacheKey("/a.fig", 10, 1, "r1");
    expect(key).toHaveLength(16);
    expect(cacheKey("/a.fig", 10, 1, "r1")).toBe(key);
    expect(cacheKey("/a.fig", 11, 1, "r1")).not.toBe(key);
    expect(cacheKey("/a.fig", 10, 2, "r1")).not.toBe(key);
    expect(cacheKey("/a.fig", 10, 1, "r2")).not.toBe(key);
  });

  it("keeps the key without restored edits and changes it with them", () => {
    const key = cacheKey("/a.fig", 10, 1, "r1");
    expect(cacheKey("/a.fig", 10, 1, "r1", "")).toBe(key);
    expect(cacheKey("/a.fig", 10, 1, "r1", "e1")).not.toBe(key);
    expect(cacheKey("/a.fig", 10, 1, "r1", "e2")).not.toBe(cacheKey("/a.fig", 10, 1, "r1", "e1"));
  });

  it("keeps the key without downloaded fonts and changes it with every font set", () => {
    const key = cacheKey("/a.fig", 10, 1, "r1");
    expect(fontKey(key, "")).toBe(key);
    expect(fontKey(key, "v1")).toMatch(/^[0-9a-f]{16}$/);
    expect(fontKey(key, "v1")).not.toBe(key);
    expect(fontKey(key, "v2")).not.toBe(fontKey(key, "v1"));
  });

  it("stores screens under filesystem-safe names and rejects other ids", () => {
    expect(thumbPath("/cache", "12:34", 0.5)).toBe("/cache/12-34.png");
    expect(thumbPath("/cache", "12:34", 2)).toBe("/cache/12-34@2x.png");
    expect(thumbPath("/cache", "../../x", 0.5)).toBeUndefined();
    expect(thumbPath("/cache", "1:2/x", 0.5)).toBeUndefined();
  });

  it("caps scale by longest side", () => {
    expect(thumbScale(375, 800, 0.5)).toBe(0.5);
    expect(thumbScale(375, 800, 2)).toBe(2);
    expect(thumbScale(375, 16384, 0.5)).toBe(0.25);
    expect(thumbScale(1440, 4096, 2)).toBe(1);
  });

  it("maps tiers that render at the same capped scale to the smallest of them", () => {
    expect(effectiveTier(375, 800, 2)).toBe(2);
    expect(effectiveTier(1440, 4096, 2)).toBe(1);
    expect(effectiveTier(1440, 16384, 2)).toBe(0.5);
    expect(effectiveTier(1440, 16384, 0.5)).toBe(0.5);
  });
});
