import type { ImageUrl, ScreenModel } from "@fignya/model";
import { classStyles } from "./class-styles";
import { renderRoot } from "./render-node";
import { renderedNode } from "./rendered-node";
import { HOST_CSS, NODE_CSS } from "./screen-css";

export type ExportOptions = { imageUrl: ImageUrl; title: string };

export type ExportedScreen = { html: string; css: string; families: string[] };

const PAGE_CSS = `body{margin:0}[data-screen]{${HOST_CSS}}${NODE_CSS}`;

const familiesOf = (host: Element): string[] =>
  [...new Set([...host.querySelectorAll("[data-id]")].flatMap((el) => renderedNode(el)?.node.style.fontFamily || []))];

const head = (title: string): string => {
  const el = document.createElement("title");
  el.textContent = title;
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width">${el.outerHTML}<link rel="stylesheet" href="styles.css">`;
};

export const exportScreen = (model: ScreenModel, options: ExportOptions): ExportedScreen => {
  const host = document.createElement("div");
  host.dataset.screen = model.rootId;
  const root = renderRoot({ nodes: model.nodes, imageUrl: options.imageUrl }, model.rootId);
  if (root) host.append(root);
  const families = familiesOf(host);
  const rules = classStyles(host);
  return {
    html: `<!doctype html><html><head>${head(options.title)}</head><body>${host.outerHTML}</body></html>`,
    css: [PAGE_CSS, ...rules].join("\n"),
    families,
  };
};
