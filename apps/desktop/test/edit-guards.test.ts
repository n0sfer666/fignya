import { describe, expect, it } from "vitest";
import { isEdit, pickEdit } from "../shared/edit-guards";

const red = { r: 255, g: 0, b: 0, a: 1 };

describe("isEdit", () => {
  it("accepts style and text edits of a target chain", () => {
    expect(isEdit({ target: ["1:2"], style: { width: 10, opacity: 0.5, fontWeight: 700 } })).toBe(true);
    expect(isEdit({ target: ["1:2", "3:4"], text: "Hi" })).toBe(true);
    expect(isEdit({ target: ["1:2"], style: { background: [{ kind: "solid", color: red }], color: red } })).toBe(true);
    expect(isEdit({ target: ["1:2"], style: { padding: [1, 2, 3, 4], borderRadius: "50%" } })).toBe(true);
    expect(isEdit({ target: ["1:2"], style: { borderRadius: [1, 1, 1, 1], left: 0, top: 0, height: 4, gap: -2, fontSize: 9 } })).toBe(true);
  });

  it("rejects malformed edits from the renderer", () => {
    expect(isEdit(null)).toBe(false);
    expect(isEdit({ target: [] , style: { width: 1 } })).toBe(false);
    expect(isEdit({ target: "1:2", style: { width: 1 } })).toBe(false);
    expect(isEdit({ target: [1], style: { width: 1 } })).toBe(false);
    expect(isEdit({ target: Array.from({ length: 65 }, () => "1:2"), style: { width: 1 } })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: { display: "flex" } })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: { width: "10px" } })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: { width: Number.NaN } })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: { padding: [1, 2] } })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: { borderRadius: "10%" } })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: { background: [{ kind: "image", hash: "x", fit: "cover" }] } })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: { color: { r: 1, g: 2, b: 3 } } })).toBe(false);
    expect(isEdit({ target: ["1:2"], text: 5 })).toBe(false);
    expect(isEdit({ target: ["1:2"] })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: {} })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: [] })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: { width: -1 } })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: { opacity: 2 } })).toBe(false);
    expect(isEdit({ target: ["1:2"], style: { color: { r: 300, g: 0, b: 0, a: 1 } } })).toBe(false);
    expect(isEdit({ target: ["1:2"], text: "x".repeat(100_001) })).toBe(false);
  });
});

describe("pickEdit", () => {
  it("keeps only the fields of an edit", () => {
    const style = { target: ["1:2"], style: { width: 1 } };
    const text = { target: ["1:2"], text: "" };
    expect(pickEdit({ ...style, ...{ junk: 1 } })).toEqual(style);
    expect(Object.keys(pickEdit(text))).toEqual(["target", "text"]);
  });
});
