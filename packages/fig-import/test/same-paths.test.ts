import { describe, expect, it } from "vitest";
import type { VectorPath } from "@fignya/model";
import { samePaths } from "../src/convert/same-paths";

const path = (d: string, extra: Partial<VectorPath> = {}): VectorPath => ({ d, fill: { r: 0, g: 0, b: 0, a: 1 }, rule: "nonzero", ...extra });

describe("samePaths", () => {
  it("treats rounding noise in coordinates as the same shape", () => {
    expect(samePaths([path("M1.21 0L2 3.5Z")], [path("M1.23 0L2 3.49Z")])).toBe(true);
  });

  it("sees moved points, other commands, fills and rules as changes", () => {
    const base = [path("M1 0L2 3Z")];
    expect(samePaths([path("M1.1 0L2 3Z")], base)).toBe(false);
    expect(samePaths([path("M1 0C2 3Z")], base)).toBe(false);
    expect(samePaths([path("M1 0L2 3Z", { rule: "evenodd" })], base)).toBe(false);
    expect(samePaths([path("M1 0L2 3Z", { fill: { r: 1, g: 0, b: 0, a: 1 } })], base)).toBe(false);
  });

  it("differs from a missing base or another path count", () => {
    expect(samePaths([path("M0 0")], undefined)).toBe(false);
    expect(samePaths([path("M0 0")], [path("M0 0"), path("M1 1")])).toBe(false);
  });
});
