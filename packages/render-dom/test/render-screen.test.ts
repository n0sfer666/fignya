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
});
