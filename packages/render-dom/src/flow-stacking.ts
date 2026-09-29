import type { Style } from "@fignya/model";

const inFlow = (el: HTMLElement): boolean => el.style.position !== "absolute";

const overlap = (style: Style, children: HTMLElement[]): void => {
  const gap = style.gap ?? 0;
  if (gap >= 0) return;
  const side = style.flexDirection === "column" ? "marginTop" : "marginLeft";
  for (const child of children.filter(inFlow).slice(1)) child.style[side] = `${gap}px`;
};

const reverseStacking = (children: HTMLElement[]): void => {
  children.forEach((child, i) => {
    child.style.zIndex = String(children.length - i);
  });
};

export const stackChildren = (style: Style, children: HTMLElement[]): void => {
  if (style.display !== "flex") return;
  overlap(style, children);
  if (style.stackOrder === "first-on-top") reverseStacking(children);
};
