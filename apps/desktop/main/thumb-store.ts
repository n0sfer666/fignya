import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { thumbPath } from "./thumb-cache";

const CACHE_DIR = /^[0-9a-f]{16}$/;

export type ThumbStore = {
  read: (screenId: string) => Promise<Uint8Array | undefined>;
  write: (screenId: string, png: Uint8Array) => Promise<void>;
  prune: () => Promise<void>;
};

export const createThumbStore = (root: string, key: string): ThumbStore => {
  const dir = join(root, key);
  return {
    read: async (screenId) => {
      const path = thumbPath(dir, screenId);
      return path ? readFile(path).catch(() => undefined) : undefined;
    },
    write: async (screenId, png) => {
      const path = thumbPath(dir, screenId);
      if (!path) return;
      await mkdir(dir, { recursive: true });
      const temp = `${path}.${process.pid}.tmp`;
      try {
        await writeFile(temp, png);
        await rename(temp, path);
      } catch (error) {
        await rm(temp, { force: true });
        throw error;
      }
    },
    prune: async () => {
      const names = await readdir(root).catch((): string[] => []);
      await Promise.all(names.filter((name) => name !== key && CACHE_DIR.test(name)).map((name) => rm(join(root, name), { recursive: true, force: true })));
    },
  };
};
