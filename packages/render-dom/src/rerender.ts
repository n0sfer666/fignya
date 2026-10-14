import type { NodeMap } from "@fignya/model";

export type Rerender = (nodes: NodeMap) => HTMLElement | undefined;

const RERENDERS = new WeakMap<Element, Rerender>();

const FROM_PARENT: ReadonlyArray<"zIndex" | "marginTop" | "marginLeft"> = ["zIndex", "marginTop", "marginLeft"];

export const rememberRerender = (el: Element, render: Rerender): void => {
  RERENDERS.set(el, render);
};

export const rerender = (el: HTMLElement, nodes: NodeMap): HTMLElement | undefined => {
  const next = RERENDERS.get(el)?.(nodes);
  if (!next) return undefined;
  for (const key of FROM_PARENT) if (el.style[key]) next.style[key] = el.style[key];
  el.replaceWith(next);
  return next;
};
