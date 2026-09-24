import { readFile, stat } from "node:fs/promises";
import { importFig, type FigImport } from "@fignya/fig-import";
import { cacheKey } from "./thumb-cache";

export type LoadedDocument = FigImport & { cacheKey: string };

export const loadDocument = async (path: string | undefined): Promise<LoadedDocument> => {
  if (!path) throw new Error("FIG_FILE is not set");
  const [data, info] = await Promise.all([readFile(path), stat(path)]);
  const started = performance.now();
  const imported = importFig(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  const screens = imported.document.pages.reduce((sum, p) => sum + p.screens.length, 0);
  console.log(`fignya: imported ${imported.document.pages.length} pages, ${screens} screens in ${Math.round(performance.now() - started)} ms`);
  return { ...imported, cacheKey: cacheKey(path, info.size, info.mtimeMs, RENDER_HASH) };
};
