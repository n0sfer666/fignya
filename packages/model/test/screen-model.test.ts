import { describe, expect, it } from "vitest";
import { screenModel, type DesignNode, type NodeId, type Override } from "../src";

const frame = (id: NodeId, children: NodeId[] = []): DesignNode => ({ id, name: id, kind: "frame", children, style: {} });
const instance = (id: NodeId, componentId: NodeId, overrides: Override[] = []): DesignNode => ({ id, name: id, kind: "instance", children: [], style: {}, componentId, overrides });
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

  it("pulls components swapped in by instance overrides", () => {
    const nodes = mapOf([frame("s", ["i"]), instance("i", "c", [{ path: ["x"], componentId: "d" }]), component("c", ["x"]), instance("x", "e"), component("d"), component("e")]);
    expect([...(screenModel(nodes, "s")?.nodes.keys() ?? [])].sort()).toEqual(["c", "d", "e", "i", "s", "x"]);
  });

  it("pulls variants reachable through swaps of layers and instance overrides", () => {
    const nodes = mapOf([
      frame("s", ["i"]),
      { ...instance("i", "v1", [{ path: ["tab"], swaps: [{ on: "click", to: "v3" }] }]), swaps: [{ on: "hover", to: "v2" }] },
      component("v1", ["tab"]),
      frame("tab"),
      { ...component("v2", ["hovered"]), swaps: [{ on: "leave", to: "v4" }] },
      frame("hovered"),
      component("v3"),
      component("v4"),
      component("unused"),
    ]);
    expect([...(screenModel(nodes, "s")?.nodes.keys() ?? [])].sort()).toEqual(["hovered", "i", "s", "tab", "v1", "v2", "v3", "v4"]);
  });

  it("returns undefined for a missing root", () => {
    expect(screenModel(mapOf([frame("s")]), "ghost")).toBeUndefined();
  });

  it("survives component cycles and missing references", () => {
    const nodes = mapOf([frame("s", ["i", "ghost"]), instance("i", "c"), component("c", ["back"]), instance("back", "c")]);
    expect([...(screenModel(nodes, "s")?.nodes.keys() ?? [])].sort()).toEqual(["back", "c", "i", "s"]);
  });
});
