import { describe, expect, it } from "vitest";
import { createEditHistory, type DesignNode, type NodeId } from "../src";

const frame: DesignNode = { id: "f", name: "f", kind: "frame", children: [], style: { width: 100 } };

const setup = () => {
  const nodes = new Map<NodeId, DesignNode>([[frame.id, frame]]);
  return { nodes, history: createEditHistory(nodes) };
};

const widthOf = (nodes: Map<NodeId, DesignNode>): number | undefined => nodes.get("f")?.style.width;

describe("createEditHistory", () => {
  it("applies edits to the document and returns their target", () => {
    const { nodes, history } = setup();
    expect(history.apply({ target: ["f"], style: { width: 120 } })).toEqual(["f"]);
    expect(widthOf(nodes)).toBe(120);
  });

  it("undoes and redoes edits one by one", () => {
    const { nodes, history } = setup();
    history.apply({ target: ["f"], style: { width: 120 } });
    history.apply({ target: ["f"], style: { width: 140 } });
    expect(history.undo()).toEqual(["f"]);
    expect(widthOf(nodes)).toBe(120);
    expect(history.undo()).toEqual(["f"]);
    expect(nodes.get("f")).toBe(frame);
    expect(history.undo()).toBeUndefined();
    expect(history.redo()).toEqual(["f"]);
    expect(widthOf(nodes)).toBe(120);
    expect(history.redo()).toEqual(["f"]);
    expect(widthOf(nodes)).toBe(140);
    expect(history.redo()).toBeUndefined();
  });

  it("drops the redo branch after a new edit", () => {
    const { nodes, history } = setup();
    history.apply({ target: ["f"], style: { width: 120 } });
    history.undo();
    history.apply({ target: ["f"], style: { width: 90 } });
    expect(history.redo()).toBeUndefined();
    expect(widthOf(nodes)).toBe(90);
  });

  it("ignores invalid edits without touching the history", () => {
    const { nodes, history } = setup();
    expect(history.apply({ target: ["x"], style: { width: 1 } })).toBeUndefined();
    expect(history.undo()).toBeUndefined();
    expect(nodes.get("f")).toBe(frame);
  });

  it("forgets the oldest edits past the limit", () => {
    const { nodes, history } = setup();
    for (let width = 1; width <= 201; width += 1) history.apply({ target: ["f"], style: { width } });
    while (history.undo()) continue;
    expect(widthOf(nodes)).toBe(1);
  });
});
