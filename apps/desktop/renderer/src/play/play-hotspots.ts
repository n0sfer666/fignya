export const HOTSPOT = "data-hotspot";

export const FLASH = "flash";

const HOTSPOT_CSS = `[${HOTSPOT}]{cursor:pointer}:host(.${FLASH}) [${HOTSPOT}]{outline:2px solid #0d99ff;outline-offset:-2px}`;

export type IsHotspot = (el: Element) => boolean;

const mark = (els: Iterable<Element>, isHotspot: IsHotspot): void => {
  for (const el of els) if (isHotspot(el)) el.setAttribute(HOTSPOT, "");
};

export const markSubtree = (el: Element, isHotspot: IsHotspot): void => mark([el, ...el.querySelectorAll("[data-id]")], isHotspot);

export const markHotspots = (root: ShadowRoot, isHotspot: IsHotspot): void => {
  mark(root.querySelectorAll("[data-id]"), isHotspot);
  const style = document.createElement("style");
  style.textContent = HOTSPOT_CSS;
  root.append(style);
};
