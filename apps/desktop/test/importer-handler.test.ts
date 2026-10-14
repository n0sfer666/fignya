import { describe, expect, it, vi } from "vitest";
import type { FigImport } from "@fignya/fig-import";
import type { DesignNode, NodeId } from "@fignya/model";
import { createImporterHandler } from "../importer/handler";
import type { ImporterEvent } from "../importer/protocol";

const bytes = new Uint8Array([1, 2]);
const doc: FigImport = { document: { nodes: new Map(), pages: [] }, images: new Map([["abc", bytes]]) };

const setup = (load: (path: string) => Promise<FigImport>) => {
  const sent: ImporterEvent[] = [];
  const settled: { doc: FigImport; afterEvents: number }[] = [];
  const settle = (loaded: FigImport): void => {
    settled.push({ doc: loaded, afterEvents: sent.length });
  };
  return { sent, settled, handle: createImporterHandler({ send: (event) => sent.push(event), load, settle }) };
};

describe("createImporterHandler", () => {
  it("loads once and answers asset queries", async () => {
    const paths: string[] = [];
    const { sent, settled, handle } = setup(async (path) => {
      paths.push(path);
      return doc;
    });
    await handle({ type: "load", path: "a.fig" });
    await handle({ type: "load", path: "b.fig" });
    await handle({ type: "image", reqId: 1, id: "abc" });
    await handle({ type: "screen", reqId: 2, id: "1:2" });
    await handle({ type: "search", reqId: 3, query: "1:2" });
    expect(paths).toEqual(["a.fig"]);
    expect(sent).toEqual([
      { type: "ready", pages: [] },
      { type: "image", reqId: 1, bytes },
      { type: "screen", reqId: 2, model: undefined },
      { type: "found", reqId: 3, hits: [] },
    ]);
    expect(settled).toEqual([{ doc, afterEvents: 1 }]);
  });

  it("refuses queries before load and after a failed load", async () => {
    const { sent, settled, handle } = setup(async () => Promise.reject(new Error("broken")));
    await handle({ type: "screen", reqId: 1, id: "1:2" });
    await handle({ type: "load", path: "a.fig" });
    await handle({ type: "image", reqId: 2, id: "abc" });
    await handle({ type: "search", reqId: 3, query: "1:2" });
    expect(sent).toEqual([
      { type: "refused", request: "screen", reqId: 1, message: "document is not loaded" },
      { type: "failed", message: "broken" },
      { type: "refused", request: "image", reqId: 2, message: "broken" },
      { type: "refused", request: "search", reqId: 3, message: "broken" },
    ]);
    expect(settled).toEqual([]);
  });

  it("refuses when the reply cannot be sent", async () => {
    const sent: ImporterEvent[] = [];
    const handle = createImporterHandler({
      send: (event) => {
        if (event.type === "image") throw new Error("could not clone");
        sent.push(event);
      },
      load: async () => doc,
      settle: () => undefined,
    });
    await handle({ type: "load", path: "a.fig" });
    await handle({ type: "image", reqId: 3, id: "abc" });
    expect(sent.at(-1)).toEqual({ type: "refused", request: "image", reqId: 3, message: "could not clone" });
  });

  it("settles and logs when ready cannot be sent", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const settled: FigImport[] = [];
    const handle = createImporterHandler({
      send: (event) => {
        if (event.type === "ready") throw new Error("port closed");
      },
      load: async () => doc,
      settle: (loaded) => settled.push(loaded),
    });
    await handle({ type: "load", path: "a.fig" });
    await vi.waitFor(() => expect(logged).toHaveBeenCalledWith("fignya: importer: load: port closed"));
    expect(settled).toEqual([doc]);
    logged.mockRestore();
  });

  it("applies edits to the loaded document, undoes and redoes them", async () => {
    const frame: DesignNode = { id: "1:2", name: "Screen", kind: "frame", children: [], style: { width: 100 } };
    const nodes = new Map<NodeId, DesignNode>([[frame.id, frame]]);
    const editable: FigImport = { document: { nodes, pages: [{ id: "0:1", name: "Page", screens: [{ id: "1:2", name: "Screen", x: 0, y: 0, width: 100, height: 50 }] }] }, images: new Map() };
    const { sent, handle } = setup(async () => editable);
    await handle({ type: "load", path: "a.fig" });
    await handle({ type: "edit", reqId: 1, edit: { target: ["1:2"], style: { width: 140 } } });
    expect(nodes.get("1:2")?.style.width).toBe(140);
    await handle({ type: "undo", reqId: 2 });
    expect(nodes.get("1:2")).toBe(frame);
    await handle({ type: "undo", reqId: 3 });
    await handle({ type: "redo", reqId: 4 });
    await handle({ type: "edit", reqId: 5, edit: { target: ["9:9"], style: { width: 1 } } });
    const change = { screenId: "1:2", target: ["1:2"] };
    expect(sent.slice(1)).toEqual([
      { type: "edited", reqId: 1, change },
      { type: "edited", reqId: 2, change },
      { type: "edited", reqId: 3, change: undefined },
      { type: "edited", reqId: 4, change },
      { type: "refused", request: "edit", reqId: 5, message: "invalid edit" },
    ]);
    expect(nodes.get("1:2")?.style.width).toBe(140);
  });
});
