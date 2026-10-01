import { stat } from "node:fs/promises";
import type { Page } from "@fignya/model";
import { startImport, type ImportClient, type ImportEvents } from "./import-client";
import { cacheKey } from "./thumb-cache";

export type LoadedDocument = Omit<ImportClient, "pages"> & { pages: Page[]; cacheKey: string };

export const loadDocument = async (path: string | undefined, events: ImportEvents): Promise<LoadedDocument> => {
  if (!path) throw new Error("FIG_FILE is not set");
  const info = await stat(path);
  const { pages, fonts, screen, image } = startImport(path, events);
  return { pages: await pages, fonts, screen, image, cacheKey: cacheKey(path, info.size, info.mtimeMs, RENDER_HASH) };
};
