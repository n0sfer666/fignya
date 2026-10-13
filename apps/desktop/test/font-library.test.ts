import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FontFaces } from "../shared/fonts";
import { createFontLibrary } from "../main/font-library";
import { RECHECK_AFTER_MS } from "../main/font-unavailable";
import { cssAnswer, fakeFetcher } from "./font-fetcher";

const ROBOTO = "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@";

const routes = {
  [`${ROBOTO}0,400`]: () => new Response(cssAnswer(400, false, "r400.woff2")),
  [`${ROBOTO}1,700`]: () => new Response(cssAnswer(700, true, "r700i.woff2")),
  "https://fonts.gstatic.com/s/r400.woff2": () => new Response(new Uint8Array([4])),
  "https://fonts.gstatic.com/s/r700i.woff2": () => new Response(new Uint8Array([7])),
};

const tempDir = (): Promise<string> => mkdtemp(join(tmpdir(), "fignya-fonts-"));

describe("font library", () => {
  it("stores downloaded faces, publishes the new set and serves the files", async () => {
    const dir = await tempDir();
    const library = createFontLibrary(dir, fakeFetcher(routes));
    const published: FontFaces[] = [];
    library.onChange((faces) => published.push(faces));
    expect(await library.faces()).toEqual({ version: "", faces: [] });
    const results = await library.download([
      { family: "Roboto", faces: [{ weight: 400, italic: false }] },
      { family: "YS Text", faces: [{ weight: 400, italic: false }] },
    ]);
    expect(results.map((r) => r.status)).toEqual(["downloaded", "unavailable"]);
    const faces = await library.faces();
    expect(published).toEqual([faces]);
    expect(faces.version).toMatch(/^[0-9a-f]{16}$/);
    expect(faces.faces).toEqual([{ family: "Roboto", weight: 400, italic: false, unicodeRange: "U+0400-045F", file: expect.stringMatching(/^[0-9a-f]{16}\.woff2$/) }]);
    const file = faces.faces[0]?.file ?? "";
    expect([...(await library.read(file)) ?? []]).toEqual([4]);
    expect(await library.read("../faces.json")).toBeUndefined();
  });

  it("reopens the stored set offline and adds faces without losing others", async () => {
    const dir = await tempDir();
    await createFontLibrary(dir, fakeFetcher(routes)).download([{ family: "Roboto", faces: [{ weight: 400, italic: false }] }]);
    const offline = createFontLibrary(dir, async () => Promise.reject(new TypeError("offline")));
    const before = await offline.faces();
    expect(before.faces.map((f) => f.weight)).toEqual([400]);
    const again = createFontLibrary(dir, fakeFetcher(routes));
    await again.download([{ family: "Roboto", faces: [{ weight: 700, italic: true }] }]);
    const after = await again.faces();
    expect(after.faces.map((f) => [f.weight, f.italic])).toEqual([
      [400, false],
      [700, true],
    ]);
    expect(after.version).not.toBe(before.version);
    expect((await readdir(dir)).sort()).toHaveLength(3);
  });

  it("ignores a corrupt manifest and entries pointing outside the cache", async () => {
    const dir = await tempDir();
    await writeFile(join(dir, "faces.json"), '[{"family":"X","weight":400,"italic":false,"file":"../../etc"}]');
    expect(await createFontLibrary(dir, fakeFetcher({})).faces()).toEqual({ version: "", faces: [] });
    await writeFile(join(dir, "faces.json"), "[{");
    expect(await createFontLibrary(dir, fakeFetcher({})).faces()).toEqual({ version: "", faces: [] });
    const file = "0123456789abcdef.woff2";
    await writeFile(
      join(dir, "faces.json"),
      JSON.stringify([
        { family: "X", weight: 400, italic: false, unicodeRange: "U+0;}*{color:red", file },
        { family: "X", weight: 400.5, italic: false, file },
      ]),
    );
    expect(await createFontLibrary(dir, fakeFetcher({})).faces()).toEqual({ version: "", faces: [] });
  });

  it("publishes a whole batch once", async () => {
    const library = createFontLibrary(await tempDir(), fakeFetcher(routes));
    const published: FontFaces[] = [];
    library.onChange((faces) => published.push(faces));
    await library.download([
      { family: "Roboto", faces: [{ weight: 400, italic: false }] },
      { family: "Roboto", faces: [{ weight: 700, italic: true }] },
    ]);
    expect(published.map((f) => f.faces.length)).toEqual([2]);
  });

  it("fails only the families it cannot store and keeps the queue alive", async () => {
    const dir = join(await tempDir(), "file");
    await writeFile(dir, "");
    const library = createFontLibrary(dir, fakeFetcher(routes));
    const results = await library.download([
      { family: "Roboto", faces: [{ weight: 400, italic: false }] },
      { family: "YS Text", faces: [{ weight: 400, italic: false }] },
    ]);
    expect(results.map((r) => r.status)).toEqual(["failed", "unavailable"]);
    expect((await library.download([{ family: "YS Text", faces: [{ weight: 400, italic: false }] }])).map((r) => r.status)).toEqual(["unavailable"]);
  });

  it("remembers faces missing from Google Fonts across restarts until the recheck is due", async () => {
    const dir = await tempDir();
    const start = 1_000_000;
    const ys = { family: "YS Text", faces: [{ weight: 400, italic: false }] };
    const ysFace = { family: "YS Text", weight: 400, italic: false };
    await createFontLibrary(dir, fakeFetcher(routes), () => start).download([ys, { family: "Roboto", faces: [{ weight: 400, italic: false }] }]);
    expect(await createFontLibrary(dir, fakeFetcher({}), () => start + RECHECK_AFTER_MS - 1).unavailable()).toEqual([ysFace]);
    expect(await createFontLibrary(dir, fakeFetcher({}), () => start + RECHECK_AFTER_MS).unavailable()).toEqual([]);
    expect(await createFontLibrary(dir, fakeFetcher({}), () => start - 1).unavailable()).toEqual([]);
    const later = start + RECHECK_AFTER_MS;
    await createFontLibrary(dir, fakeFetcher({}), () => later).download([ys]);
    expect(await createFontLibrary(dir, fakeFetcher({}), () => later + 1).unavailable()).toEqual([ysFace]);
  });

  it("remembers only the faces that were absent, not their family", async () => {
    const dir = await tempDir();
    await createFontLibrary(dir, fakeFetcher(routes)).download([
      { family: "Roboto", faces: [{ weight: 450, italic: false }] },
      { family: "Roboto", faces: [{ weight: 400, italic: false }, { weight: 500, italic: false }] },
    ]);
    expect(await createFontLibrary(dir, fakeFetcher({})).unavailable()).toEqual([
      { family: "Roboto", weight: 450, italic: false },
      { family: "Roboto", weight: 500, italic: false },
    ]);
  });

  it("forgets a face once it downloads and keeps the record untouched through a failed attempt", async () => {
    const dir = await tempDir();
    const roboto = { family: "Roboto", faces: [{ weight: 400, italic: false }] };
    await createFontLibrary(dir, fakeFetcher({})).download([roboto]);
    const record = join(dir, "unavailable.json");
    const before = await readFile(record, "utf8");
    const offline = createFontLibrary(dir, async () => Promise.reject(new TypeError("offline")));
    expect((await offline.download([roboto])).map((r) => r.status)).toEqual(["failed"]);
    expect(await readFile(record, "utf8")).toBe(before);
    await createFontLibrary(dir, fakeFetcher(routes)).download([roboto]);
    expect(await createFontLibrary(dir, fakeFetcher({})).unavailable()).toEqual([]);
  });

  it("keeps downloading when the record cannot be written and writes it on the next attempt", async () => {
    const dir = join(await tempDir(), "fonts");
    await writeFile(dir, "");
    const library = createFontLibrary(dir, fakeFetcher({}));
    const ys = { family: "YS Text", faces: [{ weight: 400, italic: false }] };
    expect((await library.download([ys])).map((r) => r.status)).toEqual(["unavailable"]);
    await rm(dir);
    await library.download([ys]);
    expect(await createFontLibrary(dir, fakeFetcher({})).unavailable()).toEqual([{ family: "YS Text", weight: 400, italic: false }]);
  });

  it("ignores a corrupt availability record", async () => {
    const dir = await tempDir();
    await writeFile(join(dir, "unavailable.json"), '[["YS Text",400,false,"x"],["Geist",400.5,false,1],["Rubik"],{"0":"Rubik"}]');
    expect(await createFontLibrary(dir, fakeFetcher({})).unavailable()).toEqual([]);
    await writeFile(join(dir, "unavailable.json"), "[[");
    expect(await createFontLibrary(dir, fakeFetcher({})).unavailable()).toEqual([]);
  });
});
