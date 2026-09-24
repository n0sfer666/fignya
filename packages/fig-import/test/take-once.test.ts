import { describe, expect, it } from "vitest";
import { takeOnce } from "../src/take-once";

describe("takeOnce", () => {
  it("hands the value out once", () => {
    const take = takeOnce("x");
    expect(take()).toBe("x");
    expect(() => take()).toThrow("value already taken");
  });
});
