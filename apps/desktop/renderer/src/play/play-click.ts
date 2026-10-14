import type { NodeId } from "@fignya/model";
import { linkOfElement } from "./play-link";
import { swapsOfElement } from "./play-swaps";

export type ClickAction = { kind: "link"; to: NodeId } | { kind: "swap"; holder: Element; to: NodeId };

const actionOf = (el: Element, isScreen: (id: NodeId) => boolean): ClickAction | undefined => {
  const link = linkOfElement(el, isScreen);
  if (link !== undefined) return { kind: "link", to: link };
  const swap = swapsOfElement(el).find((s) => s.on === "click");
  return swap && { kind: "swap", holder: el, to: swap.to };
};

export const clickAt = (path: readonly EventTarget[], isScreen: (id: NodeId) => boolean): ClickAction | undefined => {
  for (const target of path) {
    const action = target instanceof Element ? actionOf(target, isScreen) : undefined;
    if (action) return action;
  }
  return undefined;
};

export const isHotspot = (el: Element, isScreen: (id: NodeId) => boolean): boolean => actionOf(el, isScreen) !== undefined;
