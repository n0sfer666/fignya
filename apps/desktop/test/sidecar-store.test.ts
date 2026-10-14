import { mkdir, mkdtemp, readdir, readFile, rm, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sidecarStore } from "../importer/sidecar-store";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "fignya-sidecar-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("sidecarStore", () => {
  it("reads nothing when there is no sidecar and backs up nothing", async () => {
    const store = sidecarStore(join(dir, "a.fig"));
    expect(await store.read()).toBeUndefined();
    await store.backup();
    expect(await readdir(dir)).toEqual([]);
  });

  it("writes next to the file and reads it back", async () => {
    const store = sidecarStore(join(dir, "a.fig"));
    await store.write("one");
    await store.write("two");
    expect(await readdir(dir)).toEqual(["a.fig.fignya"]);
    expect(await store.read()).toBe("two");
  });

  it("copies the sidecar to a backup and keeps it until the next write", async () => {
    await writeFile(join(dir, "a.fig.fignya"), "old");
    const store = sidecarStore(join(dir, "a.fig"));
    await store.backup();
    expect((await readdir(dir)).sort()).toEqual(["a.fig.fignya", "a.fig.fignya.bak"]);
    expect(await readFile(join(dir, "a.fig.fignya.bak"), "utf8")).toBe("old");
    expect(await store.read()).toBe("old");
  });

  it("refuses to read a sidecar larger than 64 MB", async () => {
    await writeFile(join(dir, "a.fig.fignya"), "");
    await truncate(join(dir, "a.fig.fignya"), 64 * 1024 * 1024 + 1);
    await expect(sidecarStore(join(dir, "a.fig")).read()).rejects.toThrow("larger than");
  });

  it("fails to read a sidecar that is not a file", async () => {
    await mkdir(join(dir, "a.fig.fignya"));
    await expect(sidecarStore(join(dir, "a.fig")).read()).rejects.toThrow();
  });
});
