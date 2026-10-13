import type { Bounds } from "./viewport";

export type OutlineBox = { bounds: Bounds; dispose: () => void };

const measure = (frame: HTMLElement, el: Element, zoom: number): Bounds => {
  const outer = frame.getBoundingClientRect();
  const inner = el.getBoundingClientRect();
  return { x: (inner.left - outer.left) / zoom, y: (inner.top - outer.top) / zoom, width: inner.width / zoom, height: inner.height / zoom };
};

export const outlineBox = (frame: HTMLElement, host: HTMLElement, el: Element, className: string, zoom: () => number): OutlineBox => {
  const box = document.createElement("div");
  box.className = className;
  const place = (): Bounds => {
    const bounds = measure(frame, el, zoom());
    box.style.cssText = `left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px`;
    return bounds;
  };
  const bounds = place();
  frame.append(box);
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
      box.remove();
    },
  };
};
