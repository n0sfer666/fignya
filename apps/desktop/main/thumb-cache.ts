import { createHash } from "node:crypto";
import { join } from "node:path";
import { BASE_TIER } from "../shared/thumb-tiers";

const SCREEN_ID = /^\d+:\d+$/;

export const cacheKey = (path: string, size: number, mtimeMs: number, renderHash: string): string =>
  createHash("sha1").update(`${renderHash}:${path}:${size}:${mtimeMs}`).digest("hex").slice(0, 16);

const tierSuffix = (tier: number): string => (tier === BASE_TIER ? "" : `@${tier}x`);

export const thumbPath = (dir: string, screenId: string, tier: number): string | undefined =>
  SCREEN_ID.test(screenId) ? join(dir, `${screenId.replace(":", "-")}${tierSuffix(tier)}.png`) : undefined;
