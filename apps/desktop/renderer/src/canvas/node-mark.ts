import type { NodeId } from "@fignya/model";
import { findTarget } from "./find-target";
import type { Bounds } from "./viewport";

export type NodeMark = { bounds: Bounds; dispose: () => void };

const measure = (frame: HTMLElement, el: Element, zoom: number): Bounds => {
  const outer = frame.getBoundingClientRect();
  const inner = el.getBoundingClientRect();
  return { x: (inner.left - outer.left) / zoom, y: (inner.top - outer.top) / zoom, width: inner.width / zoom, height: inner.height / zoom };
};

export const markNode = (frame: HTMLElement, host: HTMLElement, target: NodeId[], zoom: () => number): NodeMark | undefined => {
  const el = host.shadowRoot && findTarget(host.shadowRoot, target);
  if (!el) return undefined;
  const mark = document.createElement("div");
  mark.className = "node-mark";
  const place = (): Bounds => {
    const bounds = measure(frame, el, zoom());
    mark.style.cssText = `left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px`;
    return bounds;
  };
  const bounds = place();
  frame.append(mark);
  const replace = (): void => void place();
  const observer = new ResizeObserver(replace);
  observer.observe(el, { box: "border-box" });
  observer.observe(host, { box: "border-box" });
  document.fonts.addEventListener("loadingdone", replace);
  return {
    bounds,
    dispose: () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", replace);
      mark.remove();
    },
  };
};
