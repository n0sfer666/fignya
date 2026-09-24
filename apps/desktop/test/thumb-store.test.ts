import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createThumbStore } from "../main/thumb-store";

describe("thumb store", () => {
  it("writes, reads back and prunes only other cache key directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "fignya-thumbs-"));
    await mkdir(join(root, "0123456789abcdef"));
    await writeFile(join(root, "0123456789abcdef", "1-1.png"), "x");
    await mkdir(join(root, "Local Storage"));
    const store = createThumbStore(root, "fedcba9876543210");
    expect(await store.read("1:2")).toBeUndefined();
    await store.write("1:2", new Uint8Array([1, 2, 3]));
    expect([...(await store.read("1:2")) ?? []]).toEqual([1, 2, 3]);
    await store.prune();
    expect((await readdir(root)).sort()).toEqual(["Local Storage", "fedcba9876543210"]);
    expect(await readdir(join(root, "fedcba9876543210"))).toEqual(["1-2.png"]);
  });
});
