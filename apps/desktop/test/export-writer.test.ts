import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeExport } from "../main/export-writer";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "fignya-export-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("writeExport", () => {
  it("creates the folder with nested files", async () => {
    const out = join(dir, "Home");
    await writeExport(out, [
      { path: "index.html", data: "<html></html>" },
      { path: "images/ab.png", data: new Uint8Array([1, 2]) },
    ]);
    expect(await readFile(join(out, "index.html"), "utf8")).toBe("<html></html>");
    expect([...(await readFile(join(out, "images/ab.png")))]).toEqual([1, 2]);
  });

  it("overwrites its own files and keeps others in an existing folder", async () => {
    await writeFile(join(dir, "index.html"), "old");
    await writeFile(join(dir, "notes.txt"), "mine");
    await writeExport(dir, [{ path: "index.html", data: "new" }]);
    expect(await readFile(join(dir, "index.html"), "utf8")).toBe("new");
    expect((await readdir(dir)).sort()).toEqual(["index.html", "notes.txt"]);
  });

  it("writes a path listed twice once, with the last data", async () => {
    await writeExport(dir, [
      { path: "fonts/a.woff2", data: "first" },
      { path: "fonts/a.woff2", data: "last" },
    ]);
    expect(await readFile(join(dir, "fonts/a.woff2"), "utf8")).toBe("last");
    expect(await readdir(join(dir, "fonts"))).toEqual(["a.woff2"]);
  });

  it("fails when the target is a file", async () => {
    const file = join(dir, "Home");
    await writeFile(file, "mine");
    await expect(writeExport(file, [{ path: "index.html", data: "new" }])).rejects.toThrow();
    expect(await readFile(file, "utf8")).toBe("mine");
  });
});
