import { rgba, round, type Declaration, type ImageUrl } from "./css-values";
import type { ColorStop, ImageFit, Paint } from "./style";

type Layer = { image: string; size: string; repeat: string };

const FULL = "100% 100%";

const NO_REPEAT = "no-repeat";

const FIT_SIZE: Record<ImageFit, string> = { cover: "cover", contain: "contain", tile: "auto", stretch: FULL };

const stops = (list: ColorStop[]): string => list.map((s) => `${rgba(s.color)} ${Math.round(s.position * 100)}%`).join(",");

const layer = (paint: Paint, url: ImageUrl): Layer => {
  switch (paint.kind) {
    case "solid":
      return { image: `linear-gradient(${rgba(paint.color)},${rgba(paint.color)})`, size: FULL, repeat: NO_REPEAT };
    case "linear":
      return { image: `linear-gradient(${round(paint.angle, 2)}deg,${stops(paint.stops)})`, size: FULL, repeat: NO_REPEAT };
    case "radial":
      return { image: `radial-gradient(${stops(paint.stops)})`, size: FULL, repeat: NO_REPEAT };
    case "image":
      return { image: `url(${url(paint.hash)})`, size: FIT_SIZE[paint.fit], repeat: paint.fit === "tile" ? "repeat" : NO_REPEAT };
  }
};

export const backgroundDeclarations = (paints: Paint[], url: ImageUrl): Declaration[] => {
  const [only] = paints;
  if (paints.length === 1 && only?.kind === "solid") return [["background-color", rgba(only.color)]];
  if (paints.length === 0) return [];
  const layers = paints.map((p) => layer(p, url));
  return [
    ["background-image", layers.map((l) => l.image).join(",")],
    ["background-size", layers.map((l) => l.size).join(",")],
    ["background-position", "center"],
    ["background-repeat", layers.map((l) => l.repeat).join(",")],
  ];
};
