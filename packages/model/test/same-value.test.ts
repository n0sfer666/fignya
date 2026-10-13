import { describe, expect, it } from "vitest";
import { sameValue } from "../src";

describe("sameValue", () => {
  it("compares nested values structurally", () => {
    expect(sameValue({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(sameValue({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false);
    expect(sameValue({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(sameValue({ a: undefined }, { b: undefined })).toBe(false);
    expect(sameValue([1], { 0: 1 })).toBe(false);
    expect(sameValue(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(sameValue(null, {})).toBe(false);
  });
});
