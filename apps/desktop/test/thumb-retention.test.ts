import { describe, expect, it } from "vitest";
import { MAX_AGE_MS, MAX_KEPT, staleCacheDirs, type CacheDir } from "../main/thumb-retention";

const NOW = 1_000_000_000_000;

const staleNames = (dirs: CacheDir[]): string[] => staleCacheDirs(dirs, NOW).map((dir) => dir.name);

describe("thumb cache retention", () => {
  it("keeps recently used directories of other cache keys", () => {
    expect(staleNames([{ name: "a", mtimeMs: NOW - 1000 }, { name: "b", mtimeMs: NOW - MAX_AGE_MS }])).toEqual([]);
  });

  it("drops directories unused for longer than the max age", () => {
    expect(staleNames([{ name: "old", mtimeMs: NOW - MAX_AGE_MS - 1 }, { name: "new", mtimeMs: NOW }])).toEqual(["old"]);
  });

  it("keeps only the freshest directories next to the own one", () => {
    const dirs = Array.from({ length: MAX_KEPT + 1 }, (_, i) => ({ name: `d${i}`, mtimeMs: NOW - i * 1000 }));
    expect(staleNames([...dirs].reverse())).toEqual(["d7", "d8"]);
  });
});
