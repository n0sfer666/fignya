import { describe, expect, it } from "vitest";
import type { Constraints, DesignNode, NodeId, Override, Style, VectorPath } from "@fignya/model";
import { renderScreen } from "../src";
import { frame, modelOf } from "./nodes";

const at = (x: number, y: number, w: number, h: number): Style => ({ position: "absolute", left: x, top: y, width: w, height: h });

const pinned = (id: NodeId, style: Style, constraints: Constraints, children: NodeId[] = []): DesignNode => ({ ...frame(id, children, style), constraints });

const instance = (id: NodeId, componentId: NodeId, style: Style, overrides: Override[] = []): DesignNode => ({ id, name: id, kind: "instance", children: [], style, componentId, overrides });

const component = (id: NodeId, children: NodeId[], style: Style): DesignNode => ({ id, name: id, kind: "component", children, style });

const PATHS: VectorPath[] = [{ d: "M0 0L14 14", fill: { r: 0, g: 0, b: 0, a: 1 }, rule: "nonzero" }];

const vector = (id: NodeId, style: Style): DesignNode => ({ id, name: id, kind: "vector", children: [], style, paths: PATHS });

const elementOf = (nodes: DesignNode[], id: NodeId): HTMLElement | null | undefined =>
  renderScreen(modelOf("s", nodes), { imageUrl: (hash) => hash }).shadowRoot?.querySelector<HTMLElement>(`[data-id="${id}"]`);

const boxOf = (nodes: DesignNode[], id: NodeId): string[] => {
  const el = elementOf(nodes, id);
  return el ? [el.style.left, el.style.top, el.style.width, el.style.height] : [];
};

const resized = (child: DesignNode, root = false): DesignNode[] => [
  ...(root ? [] : [frame("s", ["i"])]),
  instance(root ? "s" : "i", "c", at(0, 0, 60, 30)),
  component("c", ["k"], at(0, 0, 40, 20)),
  child,
];

const nestedSwap = (swapped: Style = at(0, 0, 16, 16)): DesignNode[] => [
  frame("s", ["i"]),
  instance("i", "c", at(0, 0, 44, 44), [{ path: ["n"], componentId: "e" }]),
  component("c", ["n", "m"], at(0, 0, 44, 44)),
  instance("n", "d", at(12, 12, 20, 20)),
  frame("m", [], at(30, 30, 10, 10)),
  component("d", [], at(0, 0, 20, 20)),
  component("e", ["w", "v"], swapped),
  instance("w", "g", at(0, 0, 16, 16)),
  component("g", ["p"], at(0, 0, 24, 24)),
  pinned("p", at(4, 4, 16, 16), ["center", "center"]),
  vector("v", at(1, 1, 14, 14)),
];

const slot = (overrides: Override[] = []): DesignNode[] => [
  frame("s", ["i"]),
  instance("i", "c", at(0, 0, 44, 44), [{ path: ["n"], componentId: "e" }, ...overrides]),
  component("c", ["n"], at(0, 0, 44, 44)),
  instance("n", "d", at(12, 12, 20, 20)),
  component("d", [], at(0, 0, 20, 20)),
  component("e", ["v"], at(0, 0, 16, 16)),
  frame("v", ["g"], at(1, 1, 14, 14)),
  frame("g", [], at(2, 2, 4, 4)),
];

describe("renderScreen constraints", () => {
  it("scales the whole swapped-in component to the slot size regardless of constraints", () => {
    expect(boxOf(slot(), "v")).toEqual(["1.25px", "1.25px", "17.5px", "17.5px"]);
    expect(boxOf(slot(), "g")).toEqual(["2.5px", "2.5px", "5px", "5px"]);
  });

  it("treats any own box key as the whole box and leaves the rest of it unscaled", () => {
    expect(boxOf(slot([{ path: ["n", "v"], style: { width: 14 } }]), "v")).toEqual(["1px", "1px", "14px", "14px"]);
  });

  it("keeps children unscaled when an own box moves a node without resizing it", () => {
    expect(boxOf(slot([{ path: ["n", "v"], style: { left: 1, top: 1 } }]), "g")).toEqual(["2px", "2px", "4px", "4px"]);
    expect(boxOf(slot([{ path: ["n", "v"], style: at(1, 1, 17.5, 17.5) }]), "g")).toEqual(["2.5px", "2.5px", "5px", "5px"]);
  });

  it("pins, centers and stretches children of a resized instance", () => {
    const nodes = (child: DesignNode): DesignNode[] => [frame("s", ["i"]), instance("i", "c", at(0, 0, 60, 30)), component("c", ["k"], at(0, 0, 40, 20)), child];
    expect(boxOf(nodes(pinned("k", at(30, 5, 10, 10), ["max", "center"])), "k")).toEqual(["50px", "10px", "10px", "10px"]);
    expect(boxOf(nodes(pinned("k", at(0, 0, 40, 20), ["stretch", "stretch"])), "k")).toEqual(["0px", "0px", "60px", "30px"]);
    expect(boxOf(nodes(frame("k", [], at(3, 4, 5, 6))), "k")).toEqual(["3px", "4px", "5px", "6px"]);
  });

  it("lays out grandchildren inside a stretched child", () => {
    const nodes = [
      frame("s", ["i"]),
      instance("i", "c", at(0, 0, 60, 20)),
      component("c", ["k"], at(0, 0, 40, 20)),
      pinned("k", at(0, 0, 40, 20), ["stretch", "min"], ["g"]),
      pinned("g", at(30, 0, 10, 10), ["max", "min"]),
    ];
    expect(boxOf(nodes, "g")).toEqual(["50px", "0px", "10px", "10px"]);
  });

  it("lays out a nested instance by its constraints before scaling it with the swap", () => {
    expect(boxOf(nestedSwap(), "w")).toEqual(["0px", "0px", "20px", "20px"]);
    expect(boxOf(nestedSwap(), "p")).toEqual(["0px", "0px", "20px", "20px"]);
    expect(boxOf(nestedSwap(), "m")).toEqual(["30px", "30px", "10px", "10px"]);
  });

  it("stretches vector paths to a resized box unless the instance supplies its own geometry", () => {
    const svg = elementOf(nestedSwap(), "v")?.querySelector("svg");
    expect([svg?.getAttribute("viewBox"), svg?.getAttribute("preserveAspectRatio")]).toEqual(["0 0 14 14", "none"]);
    const own = nestedSwap().map((n) => (n.id === "i" ? instance("i", "c", at(0, 0, 44, 44), [{ path: ["n"], componentId: "e" }, { path: ["n", "v"], paths: PATHS.map((p) => ({ ...p, d: "M0 0L17.5 17.5" })) }]) : n));
    expect(elementOf(own, "v")?.querySelector("svg")?.hasAttribute("viewBox")).toBe(false);
  });

  it("keeps a flat line visible and stretches recolored paths that keep the component geometry", () => {
    const line = resized(pinned("k", at(0, 10, 40, 0), ["stretch", "min"]));
    const flat = line.map((n) => (n.id === "k" ? { ...vector("k", at(0, 10, 40, 0)), constraints: n.constraints } : n));
    expect(elementOf(flat, "k")?.querySelector("svg")?.hasAttribute("viewBox")).toBe(false);
    const recolored: VectorPath[] = PATHS.map((p) => ({ ...p, fill: { r: 1, g: 0, b: 0, a: 1 } }));
    const own = nestedSwap().map((n) => (n.id === "i" ? instance("i", "c", at(0, 0, 44, 44), [{ path: ["n"], componentId: "e" }, { path: ["n", "v"], paths: recolored }]) : n));
    expect(elementOf(own, "v")?.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 14 14");
  });

  it("does not scale absolute grandchildren of a flow child inside scaled content", () => {
    const nodes = nestedSwap().flatMap((n) => {
      if (n.id !== "e") return [n];
      return [component("e", ["a"], at(0, 0, 16, 16)), frame("a", ["b"], { ...at(0, 0, 16, 16), display: "flex" }), frame("b", ["x"], { position: "relative", width: 8, height: 8 }), frame("x", [], at(1, 1, 4, 4))];
    });
    expect(boxOf(nodes, "a")).toEqual(["0px", "0px", "20px", "20px"]);
    expect(boxOf(nodes, "x")).toEqual(["1px", "1px", "4px", "4px"]);
  });

  it("does not scale a swapped-in auto layout component", () => {
    expect(boxOf(nestedSwap({ ...at(0, 0, 16, 16), display: "flex" }), "v")).toEqual(["1px", "1px", "14px", "14px"]);
  });

  it("scales and centers children of a resized instance, also at the screen root", () => {
    expect(boxOf(resized(pinned("k", at(10, 5, 20, 10), ["scale", "center"])), "k")).toEqual(["15px", "10px", "30px", "10px"]);
    expect(boxOf(resized(pinned("k", at(30, 5, 10, 10), ["max", "center"]), true), "k")).toEqual(["50px", "10px", "10px", "10px"]);
  });

  it("keeps the size of a zero-sized axis and of a rotated child", () => {
    const flat = [frame("s", ["i"]), instance("i", "c", at(0, 0, 10, 30)), component("c", ["k"], at(0, 0, 0, 20)), pinned("k", at(0, 0, 0, 10), ["scale", "scale"])];
    expect(boxOf(flat, "k")).toEqual(["0px", "0px", "0px", "15px"]);
    expect(boxOf(resized(pinned("k", { ...at(10, 4, 10, 10), transform: [0, 1, -1, 0] }, ["stretch", "scale"])), "k")).toEqual(["10px", "6px", "10px", "10px"]);
  });

  it("leaves auto layout children in flow", () => {
    const nodes = [frame("s", ["i"]), instance("i", "c", at(0, 0, 60, 20)), component("c", ["k"], at(0, 0, 40, 20)), pinned("k", { position: "relative", width: 10, height: 10 }, ["max", "max"])];
    expect(boxOf(nodes, "k")).toEqual(["", "", "10px", "10px"]);
  });
});
