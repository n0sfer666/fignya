import { describe, expect, it } from "vitest";
import { screenModel, type DesignNode, type NodeId } from "../src";

const frame = (id: NodeId, children: NodeId[] = []): DesignNode => ({ id, name: id, kind: "frame", children, style: {} });
const instance = (id: NodeId, componentId: NodeId): DesignNode => ({ id, name: id, kind: "instance", children: [], style: {}, componentId, overrides: [] });
const component = (id: NodeId, children: NodeId[] = []): DesignNode => ({ id, name: id, kind: "component", children, style: {} });

const mapOf = (nodes: DesignNode[]): Map<NodeId, DesignNode> => new Map(nodes.map((n) => [n.id, n]));

describe("screenModel", () => {
  it("collects the screen subtree only", () => {
    const nodes = mapOf([frame("s", ["a"]), frame("a", ["b"]), frame("b"), frame("other")]);
    const model = screenModel(nodes, "s");
    expect(model?.rootId).toBe("s");
    expect([...(model?.nodes.keys() ?? [])].sort()).toEqual(["a", "b", "s"]);
  });

  it("pulls referenced components transitively", () => {
    const nodes = mapOf([
      frame("s", ["i"]),
      instance("i", "c1"),
      component("c1", ["inner"]),
      instance("inner", "c2"),
      component("c2", ["leaf"]),
      frame("leaf"),
      component("unused"),
    ]);
    expect([...(screenModel(nodes, "s")?.nodes.keys() ?? [])].sort()).toEqual(["c1", "c2", "i", "inner", "leaf", "s"]);
  });

  it("uses own instance children instead of the component", () => {
    const nodes = mapOf([frame("s", ["i"]), { ...instance("i", "c"), children: ["own"] }, frame("own"), component("c", ["leaf"]), frame("leaf")]);
    expect([...(screenModel(nodes, "s")?.nodes.keys() ?? [])].sort()).toEqual(["i", "own", "s"]);
  });

  it("returns undefined for a missing root", () => {
    expect(screenModel(mapOf([frame("s")]), "ghost")).toBeUndefined();
  });

  it("survives component cycles and missing references", () => {
    const nodes = mapOf([frame("s", ["i", "ghost"]), instance("i", "c"), component("c", ["back"]), instance("back", "c")]);
    expect([...(screenModel(nodes, "s")?.nodes.keys() ?? [])].sort()).toEqual(["back", "c", "i", "s"]);
  });
});
