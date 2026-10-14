import { stat } from "node:fs/promises";
import type { Page } from "@fignya/model";
import type { Restored } from "../importer/protocol";
import { startImport, type ImportClient, type ImportEvents } from "./import-client";
import { cacheKey } from "./thumb-cache";

export type LoadedDocument = Omit<ImportClient, "opened"> & { path: string; pages: Page[]; restored: Restored; cacheKey: string };

export const loadDocument = async (path: string | undefined, events: ImportEvents): Promise<LoadedDocument> => {
  if (!path) throw new Error("FIG_FILE is not set");
  const info = await stat(path);
  const { opened, ...client } = startImport(path, events);
  const { pages, restored } = await opened;
  return { ...client, path, pages, restored, cacheKey: cacheKey(path, info.size, info.mtimeMs, RENDER_HASH, restored.key) };
};
