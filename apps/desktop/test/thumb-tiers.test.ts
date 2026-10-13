import { describe, expect, it } from "vitest";
import { isTier, tierFor } from "../shared/thumb-tiers";

describe("thumbnail tiers", () => {
  it("picks the smallest tier dense enough for the screen and caps at the largest", () => {
    expect(tierFor(0.1)).toBe(0.5);
    expect(tierFor(0.5)).toBe(0.5);
    expect(tierFor(0.6)).toBe(1);
    expect(tierFor(1.5)).toBe(2);
    expect(tierFor(16)).toBe(2);
  });

  it("accepts only known tiers", () => {
    expect(isTier(1)).toBe(true);
    expect(isTier(3)).toBe(false);
    expect(isTier(Number.NaN)).toBe(false);
  });
});
