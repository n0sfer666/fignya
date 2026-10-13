import { describe, expect, it } from "vitest";
import { editedNode, type DesignNode, type NodeMap } from "../src";

const frame: DesignNode = { id: "f", name: "f", kind: "frame", children: ["i"], style: { width: 100, opacity: 0.5 } };
const label: DesignNode = { id: "t", name: "t", kind: "text", children: [], style: { fontSize: 12 }, text: "Base" };
const inner: DesignNode = { id: "j", name: "j", kind: "instance", children: [], style: {}, componentId: "c2", overrides: [] };
const instance: DesignNode = {
  id: "i",
  name: "i",
  kind: "instance",
  children: [],
  style: {},
  componentId: "c",
  overrides: [{ path: ["t"], style: { fontSize: 14, width: 20 }, hidden: false }],
};

const nodes: NodeMap = new Map([frame, label, inner, instance].map((n) => [n.id, n]));

describe("editedNode", () => {
  it("patches the style of a stored node and keeps other keys", () => {
    expect(editedNode(nodes, { target: ["f"], style: { width: 140 } })).toEqual({ ...frame, style: { width: 140, opacity: 0.5 } });
  });

  it("sets the text of a stored text node", () => {
    expect(editedNode(nodes, { target: ["t"], text: "New", style: { fontWeight: 700 } })).toEqual({
      ...label,
      text: "New",
      style: { fontSize: 12, fontWeight: 700 },
    });
  });

  it("merges into the existing override of the outer instance", () => {
    const edited = editedNode(nodes, { target: ["i", "t"], style: { fontSize: 18 }, text: "Over" });
    expect(edited?.kind === "instance" && edited.overrides).toEqual([{ path: ["t"], style: { fontSize: 18, width: 20 }, hidden: false, text: "Over" }]);
  });

  it("adds an override for a new path through nested instances", () => {
    const edited = editedNode(nodes, { target: ["i", "j", "t"], style: { opacity: 0.2 } });
    expect(edited?.kind === "instance" && edited.overrides).toEqual([
      { path: ["t"], style: { fontSize: 14, width: 20 }, hidden: false },
      { path: ["j", "t"], style: { opacity: 0.2 } },
    ]);
  });

  it("leaves the stored node untouched", () => {
    editedNode(nodes, { target: ["i", "t"], style: { fontSize: 30 } });
    editedNode(nodes, { target: ["f"], style: { width: 1 } });
    expect(instance.kind === "instance" && instance.overrides[0]?.style).toEqual({ fontSize: 14, width: 20 });
    expect(frame.style.width).toBe(100);
  });

  it("rejects unknown targets, text on non-text layers and empty edits", () => {
    expect(editedNode(nodes, { target: [], style: { width: 1 } })).toBeUndefined();
    expect(editedNode(nodes, { target: ["x"], style: { width: 1 } })).toBeUndefined();
    expect(editedNode(nodes, { target: ["f", "t"], style: { width: 1 } })).toBeUndefined();
    expect(editedNode(nodes, { target: ["i", "x"], style: { width: 1 } })).toBeUndefined();
    expect(editedNode(nodes, { target: ["f"], text: "x" })).toBeUndefined();
    expect(editedNode(nodes, { target: ["i", "j"], text: "x" })).toBeUndefined();
    expect(editedNode(nodes, { target: ["f"] })).toBeUndefined();
  });
});
