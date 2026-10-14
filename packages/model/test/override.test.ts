import { describe, expect, it } from "vitest";
import { applyOverride, mergeOverride, styleDiff, type DesignNode, type Paint } from "../src";

const text: DesignNode = { id: "t", name: "t", kind: "text", children: [], style: { fontSize: 14, width: 10 }, text: "Base" };
const instance: DesignNode = { id: "i", name: "i", kind: "instance", children: [], style: {}, componentId: "c", overrides: [] };

describe("applyOverride", () => {
  it("returns the node untouched without an override", () => {
    expect(applyOverride(text, undefined)).toBe(text);
  });

  it("merges style, hidden and text", () => {
    expect(applyOverride(text, { path: ["t"], style: { fontSize: 20 }, hidden: true, text: "Over" })).toEqual({
      ...text,
      style: { fontSize: 20, width: 10 },
      hidden: true,
      text: "Over",
    });
  });

  it("unsets style keys overridden with undefined", () => {
    expect(applyOverride(text, { path: ["t"], style: { width: undefined } }).style.width).toBeUndefined();
  });

  it("swaps only instance components and ignores fields of other kinds", () => {
    expect(applyOverride(instance, { path: ["i"], componentId: "d", text: "x" })).toEqual({ ...instance, componentId: "d" });
    expect(applyOverride(text, { path: ["t"], componentId: "d" })).toEqual(text);
  });

  it("replaces the click link of any kind", () => {
    expect(applyOverride({ ...text, link: "s1" }, { path: ["t"], link: "s2" })).toEqual({ ...text, link: "s2" });
    expect(applyOverride(instance, { path: ["i"], link: "s2" })).toEqual({ ...instance, link: "s2" });
  });
});

describe("mergeOverride", () => {
  it("lets the outer override win and merges styles", () => {
    const inner = { path: ["a"], style: { width: 1, height: 2 }, text: "in", hidden: true };
    expect(mergeOverride(inner, { path: ["a"], style: { width: 5 }, text: "out" })).toEqual({
      path: ["a"],
      style: { width: 5, height: 2 },
      text: "out",
      hidden: true,
    });
  });

  it("returns the outer override when there is no inner one", () => {
    const outer = { path: ["a"], hidden: false };
    expect(mergeOverride(undefined, outer)).toBe(outer);
  });
});

describe("styleDiff", () => {
  it("keeps changed keys, marks removed ones and skips equal values", () => {
    const red: Paint[] = [{ kind: "solid", color: { r: 255, g: 0, b: 0, a: 1 } }];
    const diff = styleDiff({ width: 1, height: 2, background: red }, { width: 3, background: [{ kind: "solid", color: { r: 255, g: 0, b: 0, a: 1 } }] });
    expect(diff).toEqual({ width: 3, height: undefined });
    expect(Object.keys(diff)).toEqual(["width", "height"]);
  });
});
