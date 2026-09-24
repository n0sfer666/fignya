import { unzipSync } from "fflate";
import { isFigKiwi } from "./decode-canvas";

export type FigArchive = {
  canvas: Uint8Array;
  images: Map<string, Uint8Array>;
};

const IMAGES = "images/";

export const readArchive = (zipped: Uint8Array): FigArchive => {
  if (isFigKiwi(zipped)) return { canvas: zipped, images: new Map() };
  const files = unzipSync(zipped);
  const canvas = files["canvas.fig"];
  if (!canvas) throw new Error("canvas.fig not found in archive");
  const images = new Map<string, Uint8Array>();
  for (const [name, data] of Object.entries(files)) {
    if (name.startsWith(IMAGES) && name.length > IMAGES.length) images.set(name.slice(IMAGES.length), data);
  }
  return { canvas, images };
};
