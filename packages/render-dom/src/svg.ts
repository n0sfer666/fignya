import { rgba, type VectorPath } from "@fignya/model";

const SVG_NS = "http://www.w3.org/2000/svg";

export const renderSvg = (paths: VectorPath[]): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, "svg");
  for (const p of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", p.d);
    path.setAttribute("fill", rgba(p.fill));
    path.setAttribute("fill-rule", p.rule);
    svg.append(path);
  }
  return svg;
};
