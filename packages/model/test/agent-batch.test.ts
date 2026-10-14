import { describe, expect, it } from "vitest";
import { createInstanceCounter, prepareBatch } from "../src";
import { agentNodes } from "./agent-nodes";

describe("prepareBatch", () => {
  it("rejects a batch at the first bad edit with its index", () => {
    const nodes = agentNodes();
    expect(prepareBatch(nodes, [{ target: ["note"], text: "ok" }, { target: ["card", "nope"], style: { opacity: 1 } }], false)).toEqual({ index: 1, reason: "no node at this address" });
    expect(prepareBatch(nodes, [{ target: ["s"], text: "x" }], false)).toEqual({ index: 0, reason: "text is editable only on text nodes" });
    expect(prepareBatch(nodes, [{ target: ["note", "title"], text: "x" }], false)).toMatchObject({ index: 0 });
  });

  it("allows text on an overridden text inside an instance", () => {
    const nodes = agentNodes();
    expect(prepareBatch(nodes, [{ target: ["card", "btn", "label"], text: "Buy" }], false)).toEqual([{ target: ["card", "btn", "label"], text: "Buy" }]);
  });

  it("guards main components unless the agent accepts the instances", () => {
    const nodes = agentNodes();
    expect(prepareBatch(nodes, [{ target: ["title"], style: { opacity: 0.5 } }], false)).toEqual({
      index: 0,
      reason: 'edits main component "c" used by 1 instances; pass affectsInstances: true to apply',
    });
    expect(prepareBatch(nodes, [{ target: ["label"], text: "x" }], false)).toMatchObject({ index: 0, reason: expect.stringContaining("used by 2 instances") });
    expect(prepareBatch(nodes, [{ target: ["title"], style: { opacity: 0.5 } }], true)).toEqual([{ target: ["title"], style: { opacity: 0.5 } }]);
    expect(prepareBatch(nodes, [{ target: ["c2"], style: { opacity: 0.5 } }], false)).toEqual([{ target: ["c2"], style: { opacity: 0.5 } }]);
  });

  it("completes the box inside instances and accumulates it within the batch", () => {
    const nodes = agentNodes();
    expect(
      prepareBatch(nodes, [{ target: ["card", "title"], style: { width: 150 } }, { target: ["card", "title"], style: { left: 2 } }, { target: ["note"], style: { width: 5 } }], false),
    ).toEqual([
      { target: ["card", "title"], style: { left: 8, top: 8, width: 150, height: 20 } },
      { target: ["card", "title"], style: { left: 2, top: 8, width: 150, height: 20 } },
      { target: ["note"], style: { width: 5 } },
    ]);
  });

  it("counts instances through enclosing components", () => {
    const count = createInstanceCounter(agentNodes());
    expect([count("c"), count("bc"), count("c2")]).toEqual([1, 2, 0]);
  });
});
