import { isImageFill, rgba, type Color, type ImageFill, type ImageUrl, type Px, type VectorPath } from "@fignya/model";
import { imagePattern, patternIds, type PatternIds } from "./svg-image";

const SVG_NS = "http://www.w3.org/2000/svg";

const fillOf = (fill: Color | ImageFill, idOf: PatternIds): string => (isImageFill(fill) ? `url(#${idOf(fill)})` : rgba(fill));

const imageDefs = (paths: VectorPath[], idOf: PatternIds, url: ImageUrl): SVGDefsElement | undefined => {
  const images = new Map<string, ImageFill>();
  for (const { fill } of paths) if (isImageFill(fill)) images.set(idOf(fill), fill);
  if (images.size === 0) return undefined;
  const defs = document.createElementNS(SVG_NS, "defs");
  defs.append(...[...images].map(([id, fill]) => imagePattern(fill, id, url)));
  return defs;
};

export const renderSvg = (paths: VectorPath[], url: ImageUrl, viewBox?: readonly [number, number]): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, "svg");
  if (viewBox) {
    svg.setAttribute("viewBox", `0 0 ${viewBox[0]} ${viewBox[1]}`);
    svg.setAttribute("preserveAspectRatio", "none");
  }
  const idOf = patternIds();
  const defs = imageDefs(paths, idOf, url);
  if (defs) svg.append(defs);
  for (const p of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", p.d);
    path.setAttribute("fill", fillOf(p.fill, idOf));
    path.setAttribute("fill-rule", p.rule);
    svg.append(path);
  }
  return svg;
};

export const centerSvg = (svg: SVGSVGElement, [w, h]: readonly [Px, Px]): SVGSVGElement => {
  svg.style.cssText = `left:calc(50% - ${w / 2}px);top:calc(50% - ${h / 2}px);width:${w}px;height:${h}px`;
  return svg;
};
