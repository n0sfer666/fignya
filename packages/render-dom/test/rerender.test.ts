import { describe, expect, it } from "vitest";
import { swapVariant, type DesignNode, type InstanceNode, type NodeId, type Override, type Style } from "@fignya/model";
import { renderedNode, renderScreen, rerender } from "../src";
import { frame, modelOf } from "./nodes";

const imageUrl = (hash: string): string => `fignya://image/${hash}`;

const instance = (id: NodeId, componentId: NodeId, overrides: Override[] = []): DesignNode => ({ id, name: id, kind: "instance", children: [], style: {}, componentId, overrides });
const component = (id: NodeId, children: NodeId[]): DesignNode => ({ id, name: id, kind: "component", children, style: {} });
const text = (id: NodeId, value: string): DesignNode => ({ id, name: id, kind: "text", children: [], style: {}, text: value });

const at = (x: number, y: number, w: number, h: number): Style => ({ position: "absolute", left: x, top: y, width: w, height: h });

const SLOT: DesignNode[] = [
  frame("s", ["i"]),
  { ...instance("i", "c"), style: at(0, 0, 44, 44) },
  { ...component("c", ["n"]), style: at(0, 0, 44, 44) },
  { ...instance("n", "d"), parentId: "c", style: at(12, 12, 20, 20) },
  { ...component("d", []), parentId: "set", style: at(0, 0, 20, 20) },
  { ...component("e", ["v"]), parentId: "set", style: at(0, 0, 16, 16) },
  { ...frame("v", [], at(1, 1, 14, 14)), parentId: "e" },
];

const NODES: DesignNode[] = [
  frame("s", ["a", "i", "b"], { display: "flex", gap: -4, stackOrder: "first-on-top" }),
  frame("a"),
  instance("i", "c"),
  frame("b"),
  component("c", ["t", "j"]),
  text("t", "Base"),
  instance("j", "e"),
  component("e", []),
];

const rendered = (): ShadowRoot => {
  const root = renderScreen(modelOf("s", NODES), { imageUrl }).shadowRoot;
  if (!root) throw new Error("shadow root missing");
  return root;
};

const elementOf = (root: ParentNode, selector: string): HTMLElement => {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`${selector} not rendered`);
  return el;
};

describe("rerender", () => {
  it("replaces an outer instance with its subtree from the new nodes", () => {
    const root = rendered();
    const old = elementOf(root, "[data-id=i]");
    const swapped = instance("i", "c", [{ path: ["t"], text: "Over" }]);
    const next = rerender(old, new Map([...NODES, swapped].map((n) => [n.id, n])));
    expect(old.parentNode).toBeNull();
    expect(next?.parentElement?.dataset.id).toBe("s");
    expect(elementOf(root, "[data-id=i] [data-id=t]").textContent).toBe("Over");
    expect(next && renderedNode(next)?.node).toEqual(swapped);
  });

  it("keeps the stacking and overlap its parent gave it", () => {
    const root = rendered();
    const old = elementOf(root, "[data-id=i]");
    const next = rerender(old, new Map(NODES.map((n) => [n.id, n])));
    expect(next instanceof HTMLElement && [next.style.zIndex, next.style.marginLeft]).toEqual([old.style.zIndex, old.style.marginLeft]);
    expect(next instanceof HTMLElement && next.style.zIndex).toBe("2");
    expect(next?.previousElementSibling?.getAttribute("data-id")).toBe("a");
  });

  it("scales a nested Play swap to its slot like a swap from the file", () => {
    const nodes = new Map(SLOT.map((n) => [n.id, n]));
    const outer = nodes.get("i");
    const root = renderScreen(modelOf("s", SLOT), { imageUrl }).shadowRoot;
    const swapped: InstanceNode | undefined = outer?.kind === "instance" ? swapVariant(nodes, outer, ["n"], "e") : undefined;
    if (!root || !swapped) throw new Error("swap failed");
    rerender(elementOf(root, "[data-id=i]"), new Map([...nodes, ["i", swapped]]));
    const v = elementOf(root, "[data-id=v]");
    expect([v.style.left, v.style.top, v.style.width, v.style.height]).toEqual(["1.25px", "1.25px", "17.5px", "17.5px"]);
  });

  it("leaves layers other than outer instances alone", () => {
    const root = rendered();
    const nodes = new Map(NODES.map((n) => [n.id, n]));
    expect(rerender(elementOf(root, "[data-id=a]"), nodes)).toBeUndefined();
    expect(rerender(elementOf(root, "[data-id=j]"), nodes)).toBeUndefined();
  });
});
