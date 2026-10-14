import { describe, expect, it } from "vitest";
import type { Constraints, DesignNode, NodeId, Override, Style } from "@fignya/model";
import { renderedNode, renderScreen } from "../src";
import { frame, modelOf } from "./nodes";

const imageUrl = (hash: string): string => `fignya://image/${hash}`;

const stretched: Constraints = ["stretch", "stretch"];
const at = (x: number, y: number, w: number, h: number): Style => ({ position: "absolute", left: x, top: y, width: w, height: h });
const instance = (id: NodeId, componentId: NodeId, style: Style = {}, overrides: Override[] = []): DesignNode => ({ id, name: id, kind: "instance", children: [], style, componentId, overrides });
const component = (id: NodeId, children: NodeId[], style: Style = {}): DesignNode => ({ id, name: `${id} name`, kind: "component", children, style });
const text = (id: NodeId, value: string): DesignNode => ({ id, name: id, kind: "text", children: [], style: {}, text: value });

const elementOf = (nodes: DesignNode[], selector: string): Element => {
  const el = renderScreen(modelOf("s", nodes), { imageUrl }).shadowRoot?.querySelector(selector);
  if (!el) throw new Error(`${selector} not rendered`);
  return el;
};

describe("renderedNode", () => {
  it("returns the model node of the screen root without the in-flow reset", () => {
    expect(renderedNode(elementOf([frame("s", [], at(100, 200, 40, 30))], "[data-id=s]"))?.node.style).toEqual(at(100, 200, 40, 30));
  });

  it("returns a component child with the instance overrides applied", () => {
    const nodes = [frame("s", ["i"]), instance("i", "c", {}, [{ path: ["t"], text: "Over", style: { width: 42 } }]), component("c", ["t"]), text("t", "Base")];
    const found = renderedNode(elementOf(nodes, "[data-id=t]"))?.node;
    expect(found?.kind === "text" ? [found.text, found.style.width] : []).toEqual(["Over", 42]);
  });

  it("returns the box a resized instance gives its child", () => {
    const nodes = [frame("s", ["i"]), instance("i", "c", at(0, 0, 60, 30)), component("c", ["k"], at(0, 0, 40, 20)), { ...frame("k", [], at(0, 0, 40, 20)), constraints: stretched }];
    const style = renderedNode(elementOf(nodes, "[data-id=k]"))?.node.style;
    expect([style?.width, style?.height]).toEqual([60, 30]);
  });

  it("returns the component of an instance, swapped by an outer override", () => {
    const nodes = [
      frame("s", ["i"]),
      instance("i", "c", {}, [{ path: ["n"], componentId: "e" }]),
      component("c", ["n"]),
      instance("n", "d"),
      component("d", []),
      component("e", []),
    ];
    expect(renderedNode(elementOf(nodes, "[data-id=i]"))?.component?.id).toBe("c");
    expect(renderedNode(elementOf(nodes, "[data-id=n]"))?.component?.name).toBe("e name");
    expect(renderedNode(elementOf(nodes, "[data-id=s]"))?.component).toBeUndefined();
  });
});
