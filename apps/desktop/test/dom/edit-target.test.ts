import { describe, expect, it } from "vitest";
import { editedNode, fieldEdit, type DesignNode, type NodeMap } from "@fignya/model";
import { renderedNode, renderScreen } from "@fignya/render-dom";
import { editTarget, findEditTarget } from "../../renderer/src/canvas/edit-target";

const frame = (id: string, children: string[]): DesignNode => ({ id, name: id, kind: "frame", children, style: {} });
const instance = (id: string, componentId: string): DesignNode => ({ id, name: id, kind: "instance", children: [], style: {}, componentId, overrides: [] });
const label: DesignNode = { id: "t", name: "t", kind: "text", children: [], style: {}, text: "Hi" };

const nodes: NodeMap = new Map(
  [frame("s", ["a", "i", "k", "d"]), frame("a", []), instance("i", "c"), instance("k", "c"), frame("c", ["w"]), frame("w", ["j", "t"]), instance("j", "d"), frame("d", ["t"]), label].map(
    (n) => [n.id, n],
  ),
);

const rootOf = (map: NodeMap): ShadowRoot => {
  const root = renderScreen({ rootId: "s", nodes: map }, { imageUrl: (hash) => hash }).shadowRoot;
  if (!root) throw new Error("no shadow root");
  return root;
};

const at = (...chain: string[]): Element => {
  const screen = rootOf(nodes).querySelector('[data-id="s"]');
  const found = chain.reduce<Element | null | undefined>((scope, id) => scope?.querySelector(`:scope > [data-id="${id}"]`), screen);
  if (!found) throw new Error(`${chain.join("/")} missing`);
  return found;
};

const opacityAt = (root: ShadowRoot, target: string[]): string | undefined => {
  const el = findEditTarget(root, target);
  return el instanceof HTMLElement ? el.style.opacity : undefined;
};

describe("editTarget", () => {
  it("addresses a stored layer by its own id", () => {
    expect(editTarget(at("a"))).toEqual(["a"]);
    expect(editTarget(at())).toEqual(["s"]);
    expect(editTarget(at("i"))).toEqual(["i"]);
  });

  it("addresses a layer inside an instance through the outer instance, skipping component frames", () => {
    expect(editTarget(at("i", "w"))).toEqual(["i", "w"]);
    expect(editTarget(at("i", "w", "t"))).toEqual(["i", "t"]);
  });

  it("keeps nested instances in the chain", () => {
    expect(editTarget(at("i", "w", "j"))).toEqual(["i", "j"]);
    expect(editTarget(at("i", "w", "j", "t"))).toEqual(["i", "j", "t"]);
  });
});

describe("findEditTarget", () => {
  it("finds the element with exactly this address", () => {
    const root = rootOf(nodes);
    expect(editTarget(findEditTarget(root, ["k", "j", "t"]) ?? root.host)).toEqual(["k", "j", "t"]);
    expect(editTarget(findEditTarget(root, ["t"]) ?? root.host)).toEqual(["t"]);
    expect(findEditTarget(root, ["d"])?.parentElement?.getAttribute("data-id")).toBe("s");
    expect(findEditTarget(root, ["i", "x"])).toBeUndefined();
  });
});

describe("edit of a selected layer", () => {
  it("lands on that layer of that instance only", () => {
    const el = at("i", "w", "j", "t");
    const rendered = renderedNode(el);
    const target = editTarget(el);
    const edit = rendered && target && fieldEdit("opacity", "0.25", rendered.node, target);
    const edited = edit && editedNode(nodes, edit);
    if (!edited) throw new Error("edit refused");
    const root = rootOf(new Map(nodes).set(edited.id, edited));
    expect(opacityAt(root, ["i", "j", "t"])).toBe("0.25");
    expect(opacityAt(root, ["k", "j", "t"])).toBe("");
    expect(opacityAt(root, ["i", "t"])).toBe("");
    expect(opacityAt(root, ["t"])).toBe("");
  });
});
