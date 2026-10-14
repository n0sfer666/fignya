import { describe, expect, it } from "vitest";
import { fieldEdit, isEditField, type DesignNode } from "../src";

const box: DesignNode = {
  id: "b",
  name: "b",
  kind: "frame",
  children: [],
  style: { position: "absolute", left: 10, top: 20, width: 100, height: 40 },
};
const label: DesignNode = { id: "t", name: "t", kind: "text", children: [], style: { width: 30 }, text: "Hi" };

describe("isEditField", () => {
  it("knows the editable inspector fields", () => {
    expect(["width", "height", "opacity", "background-color", "color", "gap", "padding", "border-radius", "font-size", "font-weight", "text"].every(isEditField)).toBe(true);
    expect(isEditField("display")).toBe(false);
    expect(isEditField("toString")).toBe(false);
  });
});

describe("fieldEdit", () => {
  it("turns valid input into a style patch for the target", () => {
    expect(fieldEdit("width", "120px", box, ["b"])).toEqual({ target: ["b"], style: { width: 120 } });
    expect(fieldEdit("opacity", "0.3", box, ["b"])).toEqual({ target: ["b"], style: { opacity: 0.3 } });
    expect(fieldEdit("gap", "-4", box, ["b"])).toEqual({ target: ["b"], style: { gap: -4 } });
    expect(fieldEdit("padding", "8 16", box, ["b"])).toEqual({ target: ["b"], style: { padding: [8, 16, 8, 16] } });
    expect(fieldEdit("border-radius", "50%", box, ["b"])).toEqual({ target: ["b"], style: { borderRadius: "50%" } });
    expect(fieldEdit("border-radius", "4", box, ["b"])).toEqual({ target: ["b"], style: { borderRadius: [4, 4, 4, 4] } });
    expect(fieldEdit("font-size", "16", label, ["t"])).toEqual({ target: ["t"], style: { fontSize: 16 } });
    expect(fieldEdit("font-weight", "700", label, ["t"])).toEqual({ target: ["t"], style: { fontWeight: 700 } });
    expect(fieldEdit("color", "#000", label, ["t"])).toEqual({ target: ["t"], style: { color: { r: 0, g: 0, b: 0, a: 1 } } });
  });

  it("replaces the fill with one solid paint", () => {
    expect(fieldEdit("background-color", "#ff0000", box, ["b"])).toEqual({
      target: ["b"],
      style: { background: [{ kind: "solid", color: { r: 255, g: 0, b: 0, a: 1 } }] },
    });
  });

  it("sets text only on text layers", () => {
    expect(fieldEdit("text", "Hello\nworld", label, ["t"])).toEqual({ target: ["t"], text: "Hello\nworld" });
    expect(fieldEdit("text", "x", box, ["b"])).toBeUndefined();
  });

  it("rejects input out of range", () => {
    expect(fieldEdit("width", "-1", box, ["b"])).toBeUndefined();
    expect(fieldEdit("opacity", "1.5", box, ["b"])).toBeUndefined();
    expect(fieldEdit("padding", "-1 2", box, ["b"])).toBeUndefined();
    expect(fieldEdit("border-radius", "-2", box, ["b"])).toBeUndefined();
    expect(fieldEdit("font-size", "0", label, ["t"])).toBeUndefined();
    expect(fieldEdit("font-weight", "1001", label, ["t"])).toBeUndefined();
    expect(fieldEdit("width", "wide", box, ["b"])).toBeUndefined();
  });

  it("keeps the whole rendered box when resizing a layer inside an instance", () => {
    expect(fieldEdit("width", "150", box, ["i", "b"])).toEqual({ target: ["i", "b"], style: { left: 10, top: 20, width: 150, height: 40 } });
    expect(fieldEdit("height", "5", label, ["i", "t"])).toEqual({ target: ["i", "t"], style: { width: 30, height: 5 } });
    expect(fieldEdit("width", "150", box, ["b"])).toEqual({ target: ["b"], style: { width: 150 } });
  });

  it("clamps a squeezed rendered box instead of sending a negative size", () => {
    const squeezed: DesignNode = { ...box, style: { ...box.style, width: -12 } };
    expect(fieldEdit("height", "50", squeezed, ["i", "b"])).toEqual({ target: ["i", "b"], style: { left: 10, top: 20, width: 0, height: 50 } });
  });
});
