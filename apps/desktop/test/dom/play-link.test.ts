import { describe, expect, it } from "vitest";
import { renderScreen } from "@fignya/render-dom";
import { HOTSPOT, markHotspots } from "../../renderer/src/play/play-hotspots";
import { clickAt, isHotspot } from "../../renderer/src/play/play-click";
import { component, frame, instance, modelOf } from "./play-nodes";

const imageUrl = (hash: string): string => `fignya://image/${hash}`;

const isScreen = (id: string): boolean => id === "t1" || id === "t2";

const rendered = (): ShadowRoot => {
  const nodes = [frame("s", ["b", "i", "d"]), frame("b", ["n"], "t1"), frame("n"), instance("i", "c", "t2", [{ path: ["x"], link: "t1" }]), component("c", ["x", "y"]), frame("x"), frame("y"), frame("d", [], "gone")];
  const root = renderScreen(modelOf("s", nodes), { imageUrl }).shadowRoot;
  if (!root) throw new Error("no shadow root");
  return root;
};

const pathOf = (root: ShadowRoot, id: string): EventTarget[] => {
  const path: EventTarget[] = [];
  for (let el = root.querySelector(`[data-id="${id}"]`); el; el = el.parentElement) path.push(el);
  return [...path, root, root.host];
};

const linkAt = (path: EventTarget[], screen: (id: string) => boolean): string | undefined => {
  const action = clickAt(path, screen);
  return action?.kind === "link" ? action.to : undefined;
};

describe("clickAt links", () => {
  const root = rendered();

  it("takes the deepest link on the path to a screen", () => {
    expect(linkAt(pathOf(root, "n"), isScreen)).toBe("t1");
    expect(linkAt(pathOf(root, "x"), isScreen)).toBe("t1");
    expect(linkAt(pathOf(root, "y"), isScreen)).toBe("t2");
  });

  it("skips links to anything but a screen", () => {
    expect(linkAt(pathOf(root, "d"), isScreen)).toBeUndefined();
    expect(linkAt(pathOf(root, "s"), isScreen)).toBeUndefined();
  });
});

describe("markHotspots", () => {
  it("marks layers linked to a screen and styles them", () => {
    const root = rendered();
    markHotspots(root, (el) => isHotspot(el, isScreen));
    expect([...root.querySelectorAll(`[${HOTSPOT}]`)].map((el) => el.getAttribute("data-id"))).toEqual(["b", "i", "x"]);
    expect(root.querySelector("style:last-of-type")?.textContent).toContain(`[${HOTSPOT}]`);
  });
});
