import { isRec, num, recs, str, type Rec } from "../fig/guards";

const SVG_NS = "http://www.w3.org/2000/svg";

const renderSvg = (paths: Rec[]): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, "svg");
  for (const p of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", str(p, "d") ?? "");
    path.setAttribute("fill", str(p, "fill") ?? "none");
    path.setAttribute("fill-rule", str(p, "rule") ?? "nonzero");
    svg.append(path);
  }
  return svg;
};

export const renderEl = (value: unknown): HTMLElement => {
  const el = document.createElement("div");
  if (!isRec(value)) return el;
  el.style.cssText = str(value, "css") ?? "";
  const text = str(value, "text");
  if (text !== undefined) el.textContent = text;
  if (Array.isArray(value.svg)) el.append(renderSvg(recs(value, "svg")));
  for (const kid of recs(value, "kids")) el.append(renderEl(kid));
  return el;
};

export const renderThumbs = (thumbs: Rec[]): DocumentFragment => {
  const fragment = document.createDocumentFragment();
  for (const t of thumbs) {
    const img = document.createElement("img");
    img.decoding = "async";
    img.src = str(t, "src") ?? "";
    img.style.cssText = `position:absolute;left:${num(t, "x") ?? 0}px;top:${num(t, "y") ?? 0}px;width:${num(t, "w") ?? 0}px;height:${num(t, "h") ?? 0}px`;
    fragment.append(img);
  }
  return fragment;
};
