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
    expect(history.apply([{ target: ["f"], style: { width: 120 } }], "user")).toEqual([["f"]]);
    expect(widthOf(nodes)).toBe(120);
  });

  it("undoes and redoes edits one by one", () => {
    const { nodes, history } = setup();
    history.apply([{ target: ["f"], style: { width: 120 } }], "user");
    history.apply([{ target: ["f"], style: { width: 140 } }], "user");
    expect(history.undo()).toEqual([["f"]]);
    expect(widthOf(nodes)).toBe(120);
    expect(history.undo()).toEqual([["f"]]);
    expect(nodes.get("f")).toBe(frame);
    expect(history.undo()).toBeUndefined();
    expect(history.redo()).toEqual([["f"]]);
    expect(widthOf(nodes)).toBe(120);
    expect(history.redo()).toEqual([["f"]]);
    expect(widthOf(nodes)).toBe(140);
    expect(history.redo()).toBeUndefined();
  });

  it("drops the redo branch after a new edit", () => {
    const { nodes, history } = setup();
    history.apply([{ target: ["f"], style: { width: 120 } }], "user");
    history.undo();
    history.apply([{ target: ["f"], style: { width: 90 } }], "user");
    expect(history.redo()).toBeUndefined();
    expect(widthOf(nodes)).toBe(90);
  });

  it("ignores invalid edits without touching the history", () => {
    const { nodes, history } = setup();
    expect(history.apply([{ target: ["x"], style: { width: 1 } }], "user")).toEqual({ failed: 0 });
    expect(history.undo()).toBeUndefined();
    expect(nodes.get("f")).toBe(frame);
  });

  it("forgets the oldest edits past the limit", () => {
    const { nodes, history } = setup();
    for (let width = 1; width <= 201; width += 1) history.apply([{ target: ["f"], style: { width } }], "user");
    while (history.undo()) continue;
    expect(widthOf(nodes)).toBe(1);
  });
});

describe("createEditHistory edits", () => {
  it("lists the applied edits compacted, seeds first and never undoable", () => {
    const nodes = new Map<NodeId, DesignNode>([[frame.id, { ...frame, style: { width: 130 } }]]);
    const history = createEditHistory(nodes, [{ target: ["f"], style: { width: 130 } }]);
    expect(history.undo()).toBeUndefined();
    history.apply([{ target: ["f"], style: { opacity: 0.5 } }], "user");
    expect(history.edits()).toEqual([{ target: ["f"], style: { width: 130, opacity: 0.5 } }]);
    history.undo();
    expect(history.edits()).toEqual([{ target: ["f"], style: { width: 130 } }]);
    history.redo();
    expect(history.edits()).toEqual([{ target: ["f"], style: { width: 130, opacity: 0.5 } }]);
  });

  it("keeps edits forgotten by undo past the limit", () => {
    const { history } = setup();
    for (let width = 1; width <= 201; width += 1) history.apply([{ target: ["f"], style: { width } }], "user");
    while (history.undo()) continue;
    expect(history.edits()).toEqual([{ target: ["f"], style: { width: 1 } }]);
  });
});

describe("createEditHistory steps", () => {
  const two = (): DesignNode[] => [frame, { id: "g", name: "g", kind: "frame", children: [], style: { width: 10 } }];

  it("applies a batch as one step and undoes it whole", () => {
    const nodes = new Map<NodeId, DesignNode>(two().map((n) => [n.id, n]));
    const history = createEditHistory(nodes);
    const batch = [{ target: ["f"], style: { width: 1 } }, { target: ["g"], style: { width: 2 } }, { target: ["f"], style: { opacity: 0.5 } }];
    expect(history.apply(batch, "agent")).toEqual([["f"], ["g"], ["f"]]);
    expect(history.top()).toEqual({ step: 1, origin: "agent" });
    expect(history.undo()).toEqual([["f"], ["g"], ["f"]]);
    expect(nodes.get("f")).toBe(frame);
    expect(nodes.get("g")?.style.width).toBe(10);
    expect(history.top()).toBeUndefined();
    history.redo();
    expect(nodes.get("f")?.style).toEqual({ width: 1, opacity: 0.5 });
    expect(history.top()).toEqual({ step: 1, origin: "agent" });
  });

  it("applies nothing when one edit of the batch fails", () => {
    const nodes = new Map<NodeId, DesignNode>(two().map((n) => [n.id, n]));
    const history = createEditHistory(nodes);
    expect(history.apply([{ target: ["f"], style: { width: 1 } }, { target: ["x"], style: { width: 2 } }], "agent")).toEqual({ failed: 1 });
    expect(nodes.get("f")).toBe(frame);
    expect(history.top()).toBeUndefined();
    expect(history.apply([], "agent")).toEqual({ failed: 0 });
  });

  it("numbers steps and reports the origin on top", () => {
    const { history } = setup();
    history.apply([{ target: ["f"], style: { width: 1 } }], "agent");
    history.apply([{ target: ["f"], style: { width: 2 } }], "user");
    expect(history.top()).toEqual({ step: 2, origin: "user" });
    history.undo();
    expect(history.top()).toEqual({ step: 1, origin: "agent" });
  });

  it("counts the limit in steps", () => {
    const { nodes, history } = setup();
    for (let width = 1; width <= 201; width += 1) history.apply([{ target: ["f"], style: { width } }, { target: ["f"], style: { opacity: 0.5 } }], "agent");
    while (history.undo()) continue;
    expect(nodes.get("f")?.style).toEqual({ width: 1, opacity: 0.5 });
  });
});
