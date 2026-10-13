import type { ImageFill, ImageFit, ImageUrl } from "@fignya/model";

const SVG_NS = "http://www.w3.org/2000/svg";

const ASPECT: Record<ImageFit, string> = { cover: "xMidYMid slice", contain: "xMidYMid meet", tile: "xMidYMid slice", stretch: "none" };

const FULL_SIZE: ReadonlyArray<readonly [string, string]> = [
  ["x", "0"],
  ["y", "0"],
  ["width", "100%"],
  ["height", "100%"],
];

const fullSize = (el: SVGElement): void => {
  for (const [name, value] of FULL_SIZE) el.setAttribute(name, value);
};

let svgCount = 0;

export type PatternIds = (fill: ImageFill) => string;

export const patternIds = (): PatternIds => {
  svgCount += 1;
  const prefix = `image-${svgCount}`;
  return (fill) => `${prefix}-${fill.hash}-${fill.fit}`;
};

export const imagePattern = (fill: ImageFill, id: string, url: ImageUrl): SVGPatternElement => {
  const pattern = document.createElementNS(SVG_NS, "pattern");
  pattern.id = id;
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  fullSize(pattern);
  const image = document.createElementNS(SVG_NS, "image");
  image.setAttribute("href", url(fill.hash));
  image.setAttribute("preserveAspectRatio", ASPECT[fill.fit]);
  fullSize(image);
  pattern.append(image);
  return pattern;
};
