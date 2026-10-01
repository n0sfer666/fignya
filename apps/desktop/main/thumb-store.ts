import { mkdir, readdir, readFile, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { thumbPath } from "./thumb-cache";
import { staleCacheDirs, type CacheDir } from "./thumb-retention";

const CACHE_DIR = /^[0-9a-f]{16}$/;

export type ThumbStore = {
  read: (screenId: string, tier: number) => Promise<Uint8Array | undefined>;
  write: (screenId: string, tier: number, png: Uint8Array) => Promise<void>;
  prune: () => Promise<void>;
};

const cacheDirs = async (root: string, except: string): Promise<CacheDir[]> => {
  const names = await readdir(root).catch((): string[] => []);
  const dirs = await Promise.all(
    names
      .filter((name) => name !== except && CACHE_DIR.test(name))
      .map((name) => stat(join(root, name)).then((info): CacheDir[] => [{ name, mtimeMs: info.mtimeMs }], (): CacheDir[] => [])),
  );
  return dirs.flat();
};

const removeUnchanged = async (root: string, entry: CacheDir): Promise<void> => {
  const path = join(root, entry.name);
  const info = await stat(path).catch(() => undefined);
  if (info?.mtimeMs === entry.mtimeMs) await rm(path, { recursive: true, force: true, maxRetries: 3 });
};

export const createThumbStore = (root: string, key: string): ThumbStore => {
  const dir = join(root, key);
  return {
    read: async (screenId, tier) => {
      const path = thumbPath(dir, screenId, tier);
      return path ? readFile(path).catch(() => undefined) : undefined;
    },
    write: async (screenId, tier, png) => {
      const path = thumbPath(dir, screenId, tier);
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
      const now = Date.now();
      const touched = mkdir(dir, { recursive: true }).then(() => utimes(dir, new Date(now), new Date(now)));
      const stale = staleCacheDirs(await cacheDirs(root, key), now);
      const results = await Promise.allSettled([touched, ...stale.map((entry) => removeUnchanged(root, entry))]);
      const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
      if (failed) throw failed.reason;
    },
  };
};
