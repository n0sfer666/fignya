import { renderedNode, type RenderedNode } from "@fignya/render-dom";
import type { GesturePoint, GestureTap } from "./gestures";
import { hitNode } from "./hit-node";
import { outlineBox, type OutlineBox } from "./outline-box";
import { pickNode, type PickMode } from "./pick";
import type { Bounds } from "./viewport";

export type LiveScreen = { frame: HTMLElement; host: HTMLElement };

export type LiveSelection = {
  attach: (screen: LiveScreen | undefined) => void;
  click: (tap: GestureTap) => boolean;
  hover: (point: GesturePoint | undefined) => void;
  select: (el: Element | undefined) => Bounds | undefined;
  clear: () => boolean;
};

type Outlined = { el: Element; box: OutlineBox };

const modeOf = (tap: GestureTap): PickMode => {
  if (tap.meta) return "deep";
  return tap.double ? "inner" : "click";
};

export const createLiveSelection = (zoom: () => number, onSelect: (node: RenderedNode | undefined) => void): LiveSelection => {
  let screen: LiveScreen | undefined;
  let selected: Outlined | undefined;
  let hovered: Outlined | undefined;
  const outline = (el: Element, className: string): Outlined | undefined =>
    screen && { el, box: outlineBox(screen.frame, screen.host, el, className, zoom) };
  const hitOf = (path: readonly EventTarget[]): Element | undefined => {
    const root = screen?.host.shadowRoot;
    return root ? hitNode(path, root) : undefined;
  };
  const unhover = (): void => {
    hovered?.box.dispose();
    hovered = undefined;
  };
  const select = (el: Element | undefined): Bounds | undefined => {
    unhover();
    selected?.box.dispose();
    selected = el && outline(el, "node-selection");
    onSelect(selected && renderedNode(selected.el));
    return selected?.box.bounds;
  };
  const hover = (point: GesturePoint | undefined): void => {
    const hit = point && hitOf(point.path);
    const next = hit && pickNode(hit, selected?.el, point.meta ? "deep" : "click");
    if (next === hovered?.el) return;
    unhover();
    if (next && next !== selected?.el) hovered = outline(next, "node-hover");
  };
  return {
    attach: (next) => {
      select(undefined);
      screen = next;
    },
    click: (tap) => {
      const hit = hitOf(tap.path);
      if (hit) select(pickNode(hit, selected?.el, modeOf(tap)));
      return hit !== undefined;
    },
    hover,
    select,
    clear: () => {
      if (!selected) return false;
      select(undefined);
      return true;
    },
  };
};
