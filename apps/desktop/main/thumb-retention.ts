export type CacheDir = { name: string; mtimeMs: number };

export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_KEPT = 8;

export const staleCacheDirs = (others: CacheDir[], now: number): CacheDir[] =>
  [...others]
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .filter((dir, index) => index >= MAX_KEPT - 1 || now - dir.mtimeMs > MAX_AGE_MS);
