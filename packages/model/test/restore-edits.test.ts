import { describe, expect, it } from "vitest";
import { restoreEdits, type DesignNode, type NodeId } from "../src";

const frame: DesignNode = { id: "f", name: "f", kind: "frame", children: [], style: { width: 100 } };
const label: DesignNode = { id: "t", name: "t", kind: "text", children: [], style: {}, text: "Base" };

describe("restoreEdits", () => {
  it("applies edits in order and skips the ones that no longer fit", () => {
    const nodes = new Map<NodeId, DesignNode>([frame, label].map((n) => [n.id, n]));
    const applied = { target: ["f"], style: { width: 140 } };
    const text = { target: ["t"], text: "Saved" };
    const result = restoreEdits(nodes, [applied, { target: ["gone"], style: { width: 1 } }, { target: ["f"], text: "x" }, text]);
    expect(result).toEqual({ applied: [applied, text], skipped: 2 });
    expect(nodes.get("f")?.style.width).toBe(140);
    expect(nodes.get("t")).toEqual({ ...label, text: "Saved" });
  });

  it("skips an edit whose node fails to build", () => {
    const broken: DesignNode = { id: "i", name: "i", kind: "instance", children: [], style: {}, componentId: "c", overrides: [] };
    Object.defineProperty(broken, "overrides", {
      get: () => {
        throw new Error("unresolved");
      },
    });
    const nodes = new Map<NodeId, DesignNode>([broken, frame].map((n) => [n.id, n]));
    const kept = { target: ["f"], style: { width: 140 } };
    expect(restoreEdits(nodes, [{ target: ["i", "x"], text: "y" }, kept])).toEqual({ applied: [kept], skipped: 1 });
  });
});
