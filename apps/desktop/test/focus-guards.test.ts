import { describe, expect, it } from "vitest";
import { isThumbFocus } from "../main/focus-guards";

describe("isThumbFocus", () => {
  it("accepts a known tier with screen ids", () => {
    expect(isThumbFocus({ tier: 1, screenIds: ["12:34", "56:78"] })).toBe(true);
    expect(isThumbFocus({ tier: 0.5, screenIds: [] })).toBe(true);
  });

  it("rejects malformed focus from the renderer", () => {
    expect(isThumbFocus(["12:34"])).toBe(false);
    expect(isThumbFocus({ tier: 3, screenIds: ["12:34"] })).toBe(false);
    expect(isThumbFocus({ tier: 1, screenIds: [12] })).toBe(false);
    expect(isThumbFocus({ tier: 1, screenIds: [""] })).toBe(false);
    expect(isThumbFocus({ tier: 1, screenIds: ["x".repeat(65)] })).toBe(false);
    expect(isThumbFocus({ tier: 1, screenIds: Array.from({ length: 10001 }, (_, i) => `1:${i}`) })).toBe(false);
  });
});
