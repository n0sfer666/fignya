import { rgba, type Px, type VectorPath } from "@fignya/model";

const SVG_NS = "http://www.w3.org/2000/svg";

export const renderSvg = (paths: VectorPath[], viewBox?: readonly [number, number]): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, "svg");
  if (viewBox) {
    svg.setAttribute("viewBox", `0 0 ${viewBox[0]} ${viewBox[1]}`);
    svg.setAttribute("preserveAspectRatio", "none");
  }
  for (const p of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", p.d);
    path.setAttribute("fill", rgba(p.fill));
    path.setAttribute("fill-rule", p.rule);
    svg.append(path);
  }
  return svg;
};

export const centerSvg = (svg: SVGSVGElement, [w, h]: readonly [Px, Px]): SVGSVGElement => {
  svg.style.cssText = `left:calc(50% - ${w / 2}px);top:calc(50% - ${h / 2}px);width:${w}px;height:${h}px`;
  return svg;
};
