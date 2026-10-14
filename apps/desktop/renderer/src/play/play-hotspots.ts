import type { NodeId } from "@fignya/model";
import { linkOfElement } from "./play-link";

export const HOTSPOT = "data-hotspot";

export const FLASH = "flash";

const HOTSPOT_CSS = `[${HOTSPOT}]{cursor:pointer}:host(.${FLASH}) [${HOTSPOT}]{outline:2px solid #0d99ff;outline-offset:-2px}`;

export const markHotspots = (root: ShadowRoot, isScreen: (id: NodeId) => boolean): void => {
  for (const el of root.querySelectorAll("[data-id]")) {
    if (linkOfElement(el, isScreen) !== undefined) el.setAttribute(HOTSPOT, "");
  }
  const style = document.createElement("style");
  style.textContent = HOTSPOT_CSS;
  root.append(style);
};
