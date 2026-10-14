import { describe, expect, it } from "vitest";
import { isNoopEdit, type DesignNode } from "../src";

const red = { r: 255, g: 0, b: 0, a: 1 };
const box: DesignNode = { id: "b", name: "b", kind: "frame", children: [], style: { width: 100, padding: [0, 0, 0, 0], background: [{ kind: "solid", color: red }] } };
const label: DesignNode = { id: "t", name: "t", kind: "text", children: [], style: {}, text: "Hi" };

describe("isNoopEdit", () => {
  it("sees edits that keep the rendered values", () => {
    expect(isNoopEdit({ target: ["b"], style: { width: 100 } }, box)).toBe(true);
    expect(isNoopEdit({ target: ["b"], style: { padding: [0, 0, 0, 0] } }, box)).toBe(true);
    expect(isNoopEdit({ target: ["b"], style: { background: [{ kind: "solid", color: { a: 1, b: 0, g: 0, r: 255 } }] } }, box)).toBe(true);
    expect(isNoopEdit({ target: ["t"], text: "Hi" }, label)).toBe(true);
  });

  it("sees edits that change something", () => {
    expect(isNoopEdit({ target: ["b"], style: { width: 101 } }, box)).toBe(false);
    expect(isNoopEdit({ target: ["b"], style: { width: 100, opacity: 1 } }, box)).toBe(false);
    expect(isNoopEdit({ target: ["t"], text: "Hello" }, label)).toBe(false);
  });
});
