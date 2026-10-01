import { describe, expect, it } from "vitest";
import { styleDiff, type DesignNode, type NodeId, type Override, type Style } from "@fignya/model";
import { renderScreen } from "../src";
import { frame, modelOf } from "./nodes";

const imageUrl = (hash: string): string => `fignya://image/${hash}`;

const instance = (id: NodeId, componentId: NodeId, overrides: Override[] = []): DesignNode => ({ id, name: id, kind: "instance", children: [], style: {}, componentId, overrides });
const component = (id: NodeId, children: NodeId[]): DesignNode => ({ id, name: id, kind: "component", children, style: {} });
const text = (id: NodeId, value: string): DesignNode => ({ id, name: id, kind: "text", children: [], style: {}, text: value });

const render = (nodes: DesignNode[]): ShadowRoot => {
  const root = renderScreen(modelOf("s", nodes), { imageUrl }).shadowRoot;
  if (!root) throw new Error("shadow root missing");
  return root;
};

const textOf = (root: ShadowRoot, selector: string): string[] => [...root.querySelectorAll(selector)].map((el) => el.textContent ?? "");

describe("renderScreen overrides", () => {
  it("applies text, style and visibility to component children", () => {
    const root = render([
      frame("s", ["i"]),
      instance("i", "c", [{ path: ["t"], text: "Over", style: { width: 42 } }, { path: ["h"], hidden: false }, { path: ["v"], hidden: true }]),
      component("c", ["t", "h", "v"]),
      text("t", "Base"),
      { ...frame("h"), hidden: true },
      frame("v"),
    ]);
    const el = root.querySelector<HTMLElement>("[data-id=t]");
    expect(el?.textContent).toBe("Over");
    expect(el?.style.width).toBe("42px");
    expect(root.querySelector("[data-id=h]")).not.toBeNull();
    expect(root.querySelector("[data-id=v]")).toBeNull();
  });

  it("drops the turn of a flow child that an override places absolutely, and back", () => {
    const turned: Style = { position: "relative", width: 10, height: 20, centerTransform: [0, 1, -1, 0], margin: [-5, 5, -5, 5] };
    const placed: Style = { position: "absolute", left: 1, top: 2, width: 10, height: 20, transform: [0, 1, -1, 0] };
    const styleOf = (base: Style, next: Style): CSSStyleDeclaration | undefined => {
      const root = render([frame("s", ["i"]), instance("i", "c", [{ path: ["t"], style: styleDiff(base, next) }]), component("c", ["t"]), frame("t", [], base)]);
      return root.querySelector<HTMLElement>("[data-id=t]")?.style;
    };
    const absolute = styleOf(turned, placed);
    expect([absolute?.margin, absolute?.transform, absolute?.transformOrigin, absolute?.left]).toEqual(["", "matrix(0,1,-1,0,0,0)", "0 0", "1px"]);
    const flow = styleOf(placed, turned);
    expect([flow?.margin, flow?.transform, flow?.transformOrigin, flow?.left]).toEqual(["-5px 5px", "matrix(0,1,-1,0,0,0)", "", ""]);
  });

  it("does not leak overrides to other instances of the component", () => {
    const root = render([frame("s", ["a", "b"]), instance("a", "c", [{ path: ["t"], text: "A" }]), instance("b", "c"), component("c", ["t"]), text("t", "Base")]);
    expect(textOf(root, "[data-id=t]")).toEqual(["A", "Base"]);
  });

  it("swaps nested instances and resolves paths through them", () => {
    const root = render([
      frame("s", ["i"]),
      instance("i", "c", [{ path: ["n"], componentId: "e" }, { path: ["n", "et"], text: "Swapped" }]),
      component("c", ["n"]),
      instance("n", "d"),
      component("d", ["dt"]),
      text("dt", "D"),
      component("e", ["et"]),
      text("et", "E"),
    ]);
    expect(root.querySelector("[data-id=dt]")).toBeNull();
    expect(textOf(root, "[data-id=et]")).toEqual(["Swapped"]);
  });

  it("lets outer overrides win over the nested instance's own", () => {
    const root = render([
      frame("s", ["i"]),
      instance("i", "c", [{ path: ["n", "t"], text: "Outer" }]),
      component("c", ["n", "m"]),
      instance("n", "d", [{ path: ["t"], text: "Inner", style: { width: 7 } }]),
      instance("m", "d", [{ path: ["t"], text: "Own" }]),
      component("d", ["t"]),
      text("t", "Base"),
    ]);
    expect(textOf(root, "[data-id=t]")).toEqual(["Outer", "Own"]);
    expect(root.querySelector<HTMLElement>("[data-id=t]")?.style.width).toBe("7px");
  });

  it("lets outer visibility and unset styles win over the nested instance's own", () => {
    const root = render([
      frame("s", ["i"]),
      instance("i", "c", [{ path: ["n", "t"], hidden: false, style: { width: undefined } }]),
      component("c", ["n"]),
      instance("n", "d", [{ path: ["t"], hidden: true, style: { width: 7 } }]),
      component("d", ["t"]),
      text("t", "Base"),
    ]);
    expect(root.querySelector<HTMLElement>("[data-id=t]")?.style.width).toBe("");
  });

  it("resolves deep paths in the swapped-in component of a nested instance with own overrides", () => {
    const root = render([
      frame("s", ["i"]),
      instance("i", "c", [{ path: ["n"], componentId: "e" }, { path: ["n", "et"], text: "Deep" }]),
      component("c", ["n"]),
      instance("n", "d", [{ path: ["dt"], text: "Own" }]),
      component("d", ["dt"]),
      text("dt", "D"),
      component("e", ["et"]),
      text("et", "E"),
    ]);
    expect(textOf(root, "[data-id=et]")).toEqual(["Deep"]);
    expect(root.querySelector("[data-id=dt]")).toBeNull();
  });
});
