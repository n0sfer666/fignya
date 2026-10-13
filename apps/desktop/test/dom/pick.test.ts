import { describe, expect, it } from "vitest";
import { chainOf, pickNode } from "../../renderer/src/canvas/pick";

const screen = (): ShadowRoot => {
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style></style><div data-id="s"><div data-id="a"><div data-id="b"><div data-id="c"><span class="leaf"></span></div></div><div data-id="d"></div></div><div data-id="e"><div data-id="f"></div></div></div>`;
  return root;
};

const at = (root: ShadowRoot, id: string): Element => {
  const el = root.querySelector(`[data-id="${id}"]`);
  if (!el) throw new Error(`${id} missing`);
  return el;
};

const ids = (els: readonly Element[]): (string | null)[] => els.map((el) => el.getAttribute("data-id"));

describe("chainOf", () => {
  it("lists [data-id] ancestors from the screen root down to the hit", () => {
    const root = screen();
    const leaf = root.querySelector(".leaf");
    expect(leaf && ids(chainOf(leaf))).toEqual(["s", "a", "b", "c"]);
  });
});

describe("pickNode", () => {
  const pick = (hit: string, selected: string | undefined, mode: "click" | "inner" | "deep"): string | null => {
    const root = screen();
    return pickNode(at(root, hit), selected === undefined ? undefined : at(root, selected), mode).getAttribute("data-id");
  };

  it("selects the top level inside the screen on a first click", () => {
    expect(pick("c", undefined, "click")).toBe("a");
    expect(pick("f", undefined, "click")).toBe("e");
  });

  it("selects the screen root when its own background is clicked", () => {
    expect(pick("s", undefined, "click")).toBe("s");
    expect(pick("s", "c", "click")).toBe("s");
  });

  it("stays on the level of the selection: itself or a sibling", () => {
    expect(pick("c", "b", "click")).toBe("b");
    expect(pick("d", "b", "click")).toBe("d");
  });

  it("climbs to the common level when the click leaves the selection's parent", () => {
    expect(pick("f", "c", "click")).toBe("e");
    expect(pick("d", "c", "click")).toBe("d");
  });

  it("selects the top level when the screen root is selected", () => {
    expect(pick("c", "s", "click")).toBe("a");
  });

  it("steps one level inward on a double click inside the selection", () => {
    expect(pick("c", "a", "inner")).toBe("b");
    expect(pick("c", "b", "inner")).toBe("c");
    expect(pick("c", "c", "inner")).toBe("c");
  });

  it("acts as a click when a double click lands outside the selection", () => {
    expect(pick("f", "b", "inner")).toBe("e");
    expect(pick("c", undefined, "inner")).toBe("a");
  });

  it("selects the deepest layer with a modifier", () => {
    expect(pick("c", undefined, "deep")).toBe("c");
    expect(pick("f", "a", "deep")).toBe("f");
  });
});
