import { mkdir, mkdtemp, readdir, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_AGE_MS } from "../main/thumb-retention";
import { createThumbStore } from "../main/thumb-store";

const DAY_MS = 24 * 60 * 60 * 1000;

const cacheDir = async (root: string, name: string, ageMs: number): Promise<void> => {
  await mkdir(join(root, name));
  await writeFile(join(root, name, "1-1.png"), "x");
  const at = new Date(Date.now() - ageMs);
  await utimes(join(root, name), at, at);
};

describe("thumb store", () => {
  it("writes and reads back by screen and tier", async () => {
    const root = await mkdtemp(join(tmpdir(), "fignya-thumbs-"));
    const store = createThumbStore(root, "fedcba9876543210");
    expect(await store.read("1:2", 0.5)).toBeUndefined();
    await store.write("1:2", 0.5, new Uint8Array([1, 2, 3]));
    expect([...(await store.read("1:2", 0.5)) ?? []]).toEqual([1, 2, 3]);
    expect(await store.read("1:2", 2)).toBeUndefined();
    expect(await readdir(join(root, "fedcba9876543210"))).toEqual(["1-2.png"]);
  });

  it("prunes only stale cache directories of other keys, so another running instance keeps its cache", async () => {
    const root = await mkdtemp(join(tmpdir(), "fignya-thumbs-"));
    await cacheDir(root, "0123456789abcdef", DAY_MS);
    await cacheDir(root, "1111111111111111", MAX_AGE_MS + DAY_MS);
    await mkdir(join(root, "Local Storage"));
    await createThumbStore(root, "fedcba9876543210").prune();
    expect((await readdir(root)).sort()).toEqual(["0123456789abcdef", "Local Storage", "fedcba9876543210"]);
    expect(await readdir(join(root, "0123456789abcdef"))).toEqual(["1-1.png"]);
  });

  it("marks its own directory as used, even when it was stale", async () => {
    const root = await mkdtemp(join(tmpdir(), "fignya-thumbs-"));
    await cacheDir(root, "fedcba9876543210", MAX_AGE_MS + DAY_MS);
    const before = Date.now();
    await createThumbStore(root, "fedcba9876543210").prune();
    expect((await stat(join(root, "fedcba9876543210"))).mtimeMs).toBeGreaterThanOrEqual(before - 1000);
    expect(await readdir(join(root, "fedcba9876543210"))).toEqual(["1-1.png"]);
    await createThumbStore(root, "0123456789abcdef").prune();
    expect((await readdir(root)).sort()).toEqual(["0123456789abcdef", "fedcba9876543210"]);
  });

  it("still evicts stale directories when its own directory cannot be marked", async () => {
    const root = await mkdtemp(join(tmpdir(), "fignya-thumbs-"));
    await cacheDir(root, "1111111111111111", MAX_AGE_MS + DAY_MS);
    await writeFile(join(root, "fedcba9876543210"), "not a directory");
    await expect(createThumbStore(root, "fedcba9876543210").prune()).rejects.toThrow();
    expect(await readdir(root)).toEqual(["fedcba9876543210"]);
  });
});
