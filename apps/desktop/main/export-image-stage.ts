import type { ImageFiles } from "../shared/export";
import { READ_LIMIT } from "./export-files";
import { imageFile } from "./export-image-file";
import { mapLimited } from "./map-limited";

type ReadImage = (hash: string) => Promise<Uint8Array | undefined>;

export type ImageStage = { stage: (hashes: string[]) => Promise<ImageFiles>; image: ReadImage; clear: () => void };

const STAGE_TTL_MS = 60_000;

export const createImageStage = (read: ReadImage, ttlMs = STAGE_TTL_MS): ImageStage => {
  let staged = new Map<string, Uint8Array>();
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const clear = (): void => {
    clearTimeout(expiry);
    staged = new Map();
  };
  return {
    stage: async (hashes) => {
      const found = await mapLimited([...new Set(hashes)], READ_LIMIT, async (hash) => ({ hash, data: await read(hash) }));
      clear();
      staged = new Map(found.flatMap(({ hash, data }) => (data ? [[hash, data]] : [])));
      expiry = setTimeout(clear, ttlMs);
      return Object.fromEntries([...staged].map(([hash, data]) => [hash, imageFile(hash, data)]));
    },
    image: async (hash) => staged.get(hash) ?? read(hash),
    clear,
  };
};
