import { describe, expect, it } from "vitest";
import { parseColor, parseNumber, parsePx, parseSides } from "../src/css-input";

describe("parseNumber", () => {
  it("reads finite numbers and rejects the rest", () => {
    expect(parseNumber(" 0.5 ")).toBe(0.5);
    expect(parseNumber("-3")).toBe(-3);
    expect(parseNumber("")).toBeUndefined();
    expect(parseNumber("abc")).toBeUndefined();
    expect(parseNumber("Infinity")).toBeUndefined();
    expect(parseNumber("1e400")).toBeUndefined();
    expect(parseNumber("1e3")).toBeUndefined();
    expect(parseNumber("0x10")).toBeUndefined();
    expect(parseNumber("0b1")).toBeUndefined();
    expect(parseNumber(".5")).toBe(0.5);
  });
});

describe("parsePx", () => {
  it("accepts numbers with or without px", () => {
    expect(parsePx("12")).toBe(12);
    expect(parsePx("12.5px")).toBe(12.5);
    expect(parsePx(" -4 px ")).toBe(-4);
    expect(parsePx("12em")).toBeUndefined();
    expect(parsePx("px")).toBeUndefined();
  });
});

describe("parseSides", () => {
  it("expands the CSS shorthand of one to four values", () => {
    expect(parseSides("8")).toEqual([8, 8, 8, 8]);
    expect(parseSides("8px 16px")).toEqual([8, 16, 8, 16]);
    expect(parseSides("1 2 3")).toEqual([1, 2, 3, 2]);
    expect(parseSides("1px 2px 3px 4px")).toEqual([1, 2, 3, 4]);
  });

  it("rejects empty, broken and overlong input", () => {
    expect(parseSides("")).toBeUndefined();
    expect(parseSides("1 x")).toBeUndefined();
    expect(parseSides("1 2 3 4 5")).toBeUndefined();
  });
});

describe("parseColor", () => {
  it("reads hex colors", () => {
    expect(parseColor("#f00")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor("#00FF0080")).toEqual({ r: 0, g: 255, b: 0, a: 0.502 });
  });

  it("reads rgb() and rgba() as the inspector prints them", () => {
    expect(parseColor("rgba(255,0,0,0.5)")).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    expect(parseColor("rgb(1, 2, 3)")).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });

  it("rejects out of range and malformed colors", () => {
    expect(parseColor("#ff")).toBeUndefined();
    expect(parseColor("#gg0000")).toBeUndefined();
    expect(parseColor("rgb(256,0,0)")).toBeUndefined();
    expect(parseColor("rgba(0,0,0,2)")).toBeUndefined();
    expect(parseColor("rgb(0,0)")).toBeUndefined();
    expect(parseColor("red")).toBeUndefined();
    expect(parseColor("0000ff")).toBeUndefined();
    expect(parseColor("add")).toBeUndefined();
  });
});
