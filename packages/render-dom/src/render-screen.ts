import type { ImageUrl, ScreenModel } from "@fignya/model";
import { renderRoot } from "./render-node";
import { SCREEN_CSS } from "./screen-css";

export type RenderOptions = { imageUrl: ImageUrl };

export const renderScreen = (model: ScreenModel, options: RenderOptions): HTMLElement => {
  const host = document.createElement("div");
  host.dataset.screen = model.rootId;
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = SCREEN_CSS;
  shadow.append(style);
  const root = renderRoot({ nodes: model.nodes, imageUrl: options.imageUrl }, model.rootId);
  if (root) shadow.append(root);
  return host;
};
