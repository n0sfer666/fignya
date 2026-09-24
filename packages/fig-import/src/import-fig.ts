import type { DesignDocument } from "@fignya/model";
import { decodeCanvas } from "./fig/decode-canvas";
import { readArchive } from "./fig/read-archive";
import { importDocument } from "./import-document";

export type FigImport = { document: DesignDocument; images: ReadonlyMap<string, Uint8Array> };

export const importFig = (zipped: Uint8Array): FigImport => {
  const { canvas, images } = readArchive(zipped);
  return { document: importDocument(decodeCanvas(canvas)), images };
};
