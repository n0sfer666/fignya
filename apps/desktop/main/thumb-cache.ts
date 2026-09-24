import { createHash } from "node:crypto";
import { join } from "node:path";

const SCREEN_ID = /^\d+:\d+$/;

export const cacheKey = (path: string, size: number, mtimeMs: number, renderHash: string): string =>
  createHash("sha1").update(`${renderHash}:${path}:${size}:${mtimeMs}`).digest("hex").slice(0, 16);

export const thumbPath = (dir: string, screenId: string): string | undefined =>
  SCREEN_ID.test(screenId) ? join(dir, `${screenId.replace(":", "-")}.png`) : undefined;
