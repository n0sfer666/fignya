import type { Style } from "@fignya/model";

const inFlow = (el: HTMLElement): boolean => el.style.position !== "absolute";

const overlap = (style: Style, children: HTMLElement[]): void => {
  const gap = style.gap ?? 0;
  if (gap >= 0) return;
  const side = style.flexDirection === "column" ? "marginTop" : "marginLeft";
  for (const child of children.filter(inFlow).slice(1)) child.style[side] = `${(Number.parseFloat(child.style[side]) || 0) + gap}px`;
};

const reverseStacking = (parent: HTMLElement, children: HTMLElement[]): void => {
  parent.style.isolation = "isolate";
  children.forEach((child, i) => {
    child.style.zIndex = String(children.length - i);
  });
};

export const stackChildren = (style: Style, parent: HTMLElement, children: HTMLElement[]): void => {
  if (style.display !== "flex") return;
  overlap(style, children);
  if (style.stackOrder === "first-on-top") reverseStacking(parent, children);
};
