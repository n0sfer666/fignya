import { unzipSync } from "fflate";

export type FigArchive = {
  canvas: Uint8Array;
  images: Map<string, Uint8Array>;
};

export const readArchive = async (path: string): Promise<FigArchive> => {
  const zipped = new Uint8Array(await Bun.file(path).arrayBuffer());
  const files = unzipSync(zipped);
  const canvas = files["canvas.fig"];
  if (!canvas) throw new Error(`canvas.fig not found in ${path}`);
  const images = new Map<string, Uint8Array>();
  for (const [name, data] of Object.entries(files)) {
    if (name.startsWith("images/")) images.set(name.slice("images/".length), data);
  }
  return { canvas, images };
};
