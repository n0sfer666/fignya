import { describe, expect, it } from "vitest";
import type { DesignNode } from "@fignya/model";
import { renderScreen } from "../src";
import { frame, modelOf } from "./nodes";

const imageUrl = (hash: string): string => `fignya://image/${hash}`;

const rootOf = (host: HTMLElement): HTMLElement => {
  const root = host.shadowRoot?.querySelector<HTMLElement>("[data-id]");
  if (!root) throw new Error("screen root missing");
  return root;
};

const ids = (el: Element): string[] => [...el.children].map((c) => c.getAttribute("data-id") ?? c.tagName.toLowerCase());

describe("renderScreen", () => {
  it("renders the screen root in-flow inside an open shadow root", () => {
    const model = modelOf("s", [frame("s", [], { position: "absolute", left: 50, top: 60, width: 375, height: 800, transform: [0, 1, -1, 0] })]);
    const host = renderScreen(model, { imageUrl });
    const root = rootOf(host);
    expect(host.shadowRoot?.querySelector("style")).not.toBeNull();
    expect(root.style.position).toBe("relative");
    expect(root.style.left).toBe("");
    expect(root.style.transform).toBe("");
    expect(root.style.width).toBe("375px");
    expect(host.dataset.screen).toBe("s");
  });

  it("renders children in order and skips hidden or missing ones", () => {
    const model = modelOf("s", [frame("s", ["a", "gone", "h", "b"]), frame("a"), { ...frame("h"), hidden: true }, frame("b")]);
    expect(ids(rootOf(renderScreen(model, { imageUrl })))).toEqual(["a", "b"]);
  });

  it("renders text content", () => {
    const text: DesignNode = { id: "t", name: "t", kind: "text", children: [], style: { fontSize: 14 }, text: "Hi\nthere" };
    const el = rootOf(renderScreen(modelOf("s", [frame("s", ["t"]), text]), { imageUrl })).querySelector<HTMLElement>("[data-id=t]");
    expect(el?.textContent).toBe("Hi\nthere");
    expect(el?.dataset.kind).toBe("text");
    expect(el?.style.fontSize).toBe("14px");
  });

  it("renders vector paths as svg and ignores vector children", () => {
    const vector: DesignNode = {
      id: "v",
      name: "v",
      kind: "vector",
      children: ["x"],
      style: {},
      paths: [{ d: "M0 0L1 1Z", fill: { r: 255, g: 0, b: 0, a: 1 }, rule: "evenodd" }],
    };
    const el = rootOf(renderScreen(modelOf("s", [frame("s", ["v"]), vector, frame("x")]), { imageUrl })).querySelector("[data-id=v]");
    const path = el?.querySelector("svg path");
    expect(path?.getAttribute("d")).toBe("M0 0L1 1Z");
    expect(path?.getAttribute("fill")).toBe("rgba(255,0,0,1)");
    expect(path?.getAttribute("fill-rule")).toBe("evenodd");
    expect(el?.querySelector("[data-id=x]")).toBeNull();
  });

  it("expands instances with component children", () => {
    const instance: DesignNode = { id: "i", name: "i", kind: "instance", children: [], style: {}, componentId: "c", overrides: [] };
    const component: DesignNode = { id: "c", name: "c", kind: "component", children: ["leaf"], style: {} };
    const el = rootOf(renderScreen(modelOf("s", [frame("s", ["i"]), instance, component, frame("leaf")]), { imageUrl }));
    expect(ids(el.querySelector("[data-id=i]") ?? el)).toEqual(["leaf"]);
  });

  it("stops on component cycles", () => {
    const instance: DesignNode = { id: "i", name: "i", kind: "instance", children: [], style: {}, componentId: "c", overrides: [] };
    const component: DesignNode = { id: "c", name: "c", kind: "component", children: ["i"], style: {} };
    const host = renderScreen(modelOf("s", [frame("s", ["i"]), instance, component]), { imageUrl });
    expect(host.shadowRoot?.querySelectorAll("[data-id=i]").length).toBe(2);
  });

  it("stops on branching component cycles", () => {
    const instance = (id: string): DesignNode => ({ id, name: id, kind: "instance", children: [], style: {}, componentId: "c", overrides: [] });
    const component: DesignNode = { id: "c", name: "c", kind: "component", children: ["a", "b"], style: {} };
    const host = renderScreen(modelOf("s", [frame("s", ["a"]), instance("a"), instance("b"), component]), { imageUrl });
    expect(host.shadowRoot?.querySelectorAll("[data-kind=instance]").length).toBe(3);
  });

  it("expands the same component in sibling branches", () => {
    const instance = (id: string): DesignNode => ({ id, name: id, kind: "instance", children: [], style: {}, componentId: "c", overrides: [] });
    const component: DesignNode = { id: "c", name: "c", kind: "component", children: ["leaf"], style: {} };
    const host = renderScreen(modelOf("s", [frame("s", ["a", "b"]), instance("a"), instance("b"), component, frame("leaf")]), { imageUrl });
    expect(host.shadowRoot?.querySelectorAll("[data-id=leaf]").length).toBe(2);
  });

  it("resolves image paints through imageUrl", () => {
    const model = modelOf("s", [frame("s", [], { background: [{ kind: "image", hash: "ab", fit: "cover" }] })]);
    expect(rootOf(renderScreen(model, { imageUrl })).getAttribute("style")).toContain("fignya://image/ab");
  });

  it("overlaps flow children by a negative gap along the main axis", () => {
    const overlapped = (flexDirection: "row" | "column"): string[][] => {
      const nodes = [frame("s", ["abs", "a", "b", "c"], { display: "flex", flexDirection, gap: -2 }), frame("abs", [], { position: "absolute" }), frame("a"), frame("b"), frame("c")];
      const root = rootOf(renderScreen(modelOf("s", nodes), { imageUrl }));
      return [...root.children].map((c) => c instanceof HTMLElement ? [c.style.marginLeft, c.style.marginTop] : []);
    };
    expect(overlapped("row")).toEqual([["", ""], ["", ""], ["-2px", ""], ["-2px", ""]]);
    expect(overlapped("column")).toEqual([["", ""], ["", ""], ["", "-2px"], ["", "-2px"]]);
  });

  it("keeps the svg of a turned fill child at its stored size in the middle of the grown box", () => {
    const vector: DesignNode = { id: "v", name: "v", kind: "vector", children: [], style: { flexGrow: 1, contentSize: [215, 0] }, paths: [] };
    const svg = rootOf(renderScreen(modelOf("s", [frame("s", ["v"]), vector]), { imageUrl })).querySelector<SVGSVGElement>("[data-id=v] svg");
    expect(svg ? [svg.style.left, svg.style.top, svg.style.width, svg.style.height] : []).toEqual(["calc(50% - 107.5px)", "calc(50% - 0px)", "215px", "0px"]);
  });

  it("leaves the svg of a screen root vector filling the root", () => {
    const vector: DesignNode = { id: "v", name: "v", kind: "vector", children: [], style: { contentSize: [215, 0] }, paths: [] };
    const svg = rootOf(renderScreen(modelOf("v", [vector]), { imageUrl })).querySelector<SVGSVGElement>("svg");
    expect(svg?.getAttribute("style") ?? "").toBe("");
  });

  it("adds a negative gap to the margin that sizes a turned flow child", () => {
    const nodes = [frame("s", ["a", "b"], { display: "flex", flexDirection: "row", gap: -2 }), frame("a"), frame("b", [], { centerTransform: [0, 1, -1, 0], margin: [-5, 5, -5, 5] })];
    const turned = rootOf(renderScreen(modelOf("s", nodes), { imageUrl })).children[1];
    expect(turned instanceof HTMLElement ? [turned.style.marginLeft, turned.style.marginTop, turned.style.transform] : []).toEqual(["3px", "-5px", "matrix(0,1,-1,0,0,0)"]);
  });

  it("adds a negative gap to the top margin of a turned child in a column", () => {
    const nodes = [frame("s", ["a", "b"], { display: "flex", flexDirection: "column", gap: -2 }), frame("a"), frame("b", [], { centerTransform: [0, 1, -1, 0], margin: [-5, 5, -5, 5] })];
    const turned = rootOf(renderScreen(modelOf("s", nodes), { imageUrl })).children[1];
    expect(turned instanceof HTMLElement ? [turned.style.marginTop, turned.style.marginLeft] : []).toEqual(["-7px", "5px"]);
  });

  it("starts the overlap from the first visible child", () => {
    const nodes = [frame("s", ["gone", "a", "b"], { display: "flex", gap: -3 }), { ...frame("gone"), hidden: true }, frame("a"), frame("b")];
    const root = rootOf(renderScreen(modelOf("s", nodes), { imageUrl }));
    expect([...root.children].map((c) => c instanceof HTMLElement && c.style.marginLeft)).toEqual(["", "-3px"]);
  });

  it("stacks the first child on top when the container reverses the order", () => {
    const nodes = [frame("s", ["a", "b", "abs"], { display: "flex", stackOrder: "first-on-top" }), frame("a"), frame("b"), frame("abs", [], { position: "absolute" })];
    const root = rootOf(renderScreen(modelOf("s", nodes), { imageUrl }));
    expect([...root.children].map((c) => c instanceof HTMLElement && c.style.zIndex)).toEqual(["3", "2", "1"]);
  });

  it("leaves children unshifted under a positive gap", () => {
    const root = rootOf(renderScreen(modelOf("s", [frame("s", ["a", "b"], { display: "flex", gap: 4 }), frame("a"), frame("b")]), { imageUrl }));
    expect(root.style.gap).toBe("4px");
    expect([...root.children].map((c) => c instanceof HTMLElement && c.style.marginLeft)).toEqual(["", ""]);
  });
});
