import { describe, expect, it } from "vitest";
import { swapVariant, type DesignNode, type InstanceNode, type NodeId, type Override } from "../src";
import { D_STYLE, V_STYLE, VARIANT_NODES } from "./variant-nodes";

const outer = (componentId: NodeId, overrides: Override[], extra: Partial<InstanceNode> = {}): InstanceNode => ({
  id: "i",
  name: "Button",
  kind: "instance",
  children: [],
  style: {},
  componentId,
  overrides,
  ...extra,
});

const nested: DesignNode = {
  id: "n",
  name: "Button",
  parentId: "card",
  kind: "instance",
  children: [],
  style: { left: 5, background: V_STYLE.background },
  componentId: "v",
  overrides: [{ path: ["v-icon"], hidden: true }],
  swaps: [{ on: "hover", to: "d" }],
};

const card: DesignNode = { id: "card", name: "card", kind: "component", children: ["n", "other"], style: {} };

const nodes = new Map([...VARIANT_NODES, nested, card].map((n) => [n.id, n]));

describe("swapVariant", () => {
  it("moves the overrides of the instance itself to the twin layers", () => {
    const swapped = swapVariant(nodes, outer("v", [{ path: ["v-label"], text: "Hi" }, { path: ["v-chip", "c1-t"], hidden: true }, { path: ["v-gone"], hidden: true }]), [], "d");
    expect(swapped?.componentId).toBe("d");
    expect(swapped?.overrides).toEqual([
      { path: ["d-label"], text: "Hi" },
      { path: ["d-chip", "c2-t"], hidden: true },
    ]);
  });

  it("takes the root style of the new variant and keeps the own box and own changes", () => {
    const style = { ...V_STYLE, left: 10, opacity: 0.5 };
    const swapped = swapVariant(nodes, outer("v", [], { style }), [], "d");
    expect(swapped?.style).toEqual({ left: 10, width: 50, background: D_STYLE.background, opacity: 0.5, borderRadius: D_STYLE.borderRadius });
  });

  it("takes the swaps of the new variant and keeps the own link", () => {
    const swapped = swapVariant(nodes, outer("v", [], { link: "s2", swaps: [{ on: "hover", to: "d" }] }), [], "d");
    expect(swapped?.swaps).toEqual([{ on: "leave", to: "v" }]);
    expect(swapped?.link).toBe("s2");
  });

  it("swaps a nested instance through an override and carries its own overrides", () => {
    const host = outer("card", [{ path: ["n", "v-label"], text: "Hi" }, { path: ["other"], hidden: true }]);
    expect(swapVariant(nodes, host, ["n"], "d")?.overrides).toEqual([
      { path: ["n", "d-label"], text: "Hi" },
      { path: ["other"], hidden: true },
      { path: ["n", "d-icon"], hidden: true },
      { path: ["n"], componentId: "d", swaps: [{ on: "leave", to: "v" }], style: { background: D_STYLE.background, borderRadius: D_STYLE.borderRadius } },
    ]);
  });

  it("swaps a nested instance back without losing the carried overrides", () => {
    const host = outer("card", [{ path: ["n", "v-label"], text: "Hi" }]);
    const there = swapVariant(nodes, host, ["n"], "d");
    const back = there && swapVariant(nodes, there, ["n"], "v");
    expect(back?.overrides).toEqual([
      { path: ["n", "v-label"], text: "Hi" },
      { path: ["n", "v-icon"], hidden: true },
      { path: ["n"], componentId: "v", swaps: [{ on: "hover", to: "d" }], style: { background: V_STYLE.background, borderRadius: undefined } },
    ]);
  });

  it("returns the same instance for the current variant and nothing for unknown targets", () => {
    const same = outer("v", []);
    expect(swapVariant(nodes, same, [], "v")).toBe(same);
    expect(swapVariant(nodes, same, [], "x")).toBeUndefined();
    expect(swapVariant(nodes, outer("card", []), ["other"], "d")).toBeUndefined();
    expect(swapVariant(nodes, outer("card", []), ["x"], "d")).toBeUndefined();
  });
});
