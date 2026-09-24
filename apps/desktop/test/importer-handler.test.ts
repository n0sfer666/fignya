import { describe, expect, it } from "vitest";
import type { FigImport } from "@fignya/fig-import";
import { createImporterHandler } from "../importer/handler";
import type { ImporterEvent } from "../importer/protocol";

const bytes = new Uint8Array([1, 2]);
const doc: FigImport = { document: { nodes: new Map(), pages: [] }, images: new Map([["abc", bytes]]) };

const setup = (load: (path: string) => Promise<FigImport>) => {
  const sent: ImporterEvent[] = [];
  return { sent, handle: createImporterHandler((event) => sent.push(event), load) };
};

describe("createImporterHandler", () => {
  it("loads once and answers asset queries", async () => {
    const paths: string[] = [];
    const { sent, handle } = setup(async (path) => {
      paths.push(path);
      return doc;
    });
    await handle({ type: "load", path: "a.fig" });
    await handle({ type: "load", path: "b.fig" });
    await handle({ type: "image", reqId: 1, id: "abc" });
    await handle({ type: "screen", reqId: 2, id: "1:2" });
    expect(paths).toEqual(["a.fig"]);
    expect(sent).toEqual([
      { type: "ready", pages: [] },
      { type: "image", reqId: 1, bytes },
      { type: "screen", reqId: 2, model: undefined },
    ]);
  });

  it("refuses queries before load and after a failed load", async () => {
    const { sent, handle } = setup(async () => Promise.reject(new Error("broken")));
    await handle({ type: "screen", reqId: 1, id: "1:2" });
    await handle({ type: "load", path: "a.fig" });
    await handle({ type: "image", reqId: 2, id: "abc" });
    expect(sent).toEqual([
      { type: "refused", request: "screen", reqId: 1, message: "document is not loaded" },
      { type: "failed", message: "broken" },
      { type: "refused", request: "image", reqId: 2, message: "broken" },
    ]);
  });

  it("refuses when the reply cannot be sent", async () => {
    const sent: ImporterEvent[] = [];
    const handle = createImporterHandler((event) => {
      if (event.type === "image") throw new Error("could not clone");
      sent.push(event);
    }, async () => doc);
    await handle({ type: "load", path: "a.fig" });
    await handle({ type: "image", reqId: 3, id: "abc" });
    expect(sent.at(-1)).toEqual({ type: "refused", request: "image", reqId: 3, message: "could not clone" });
  });
});
