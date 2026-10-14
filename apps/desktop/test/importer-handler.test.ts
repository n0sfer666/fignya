import { describe, expect, it, vi } from "vitest";
import type { FigImport } from "@fignya/fig-import";
import type { DesignNode, NodeId } from "@fignya/model";
import { createImporterHandler, type LoadedFig } from "../importer/handler";
import type { ImporterEvent } from "../importer/protocol";
import type { SidecarStore } from "../importer/sidecar-store";

const bytes = new Uint8Array([1, 2]);
const doc: FigImport = { document: { nodes: new Map(), pages: [] }, images: new Map([["abc", bytes]]) };
const base = { size: 2, sha256: "ab".repeat(32) };
const restored = { edits: 0, skipped: 0, stale: false, key: "" };

const memoryStore = (written: string[]) => (): SidecarStore => ({
  read: async () => undefined,
  write: async (text) => {
    written.push(text);
  },
  backup: async () => undefined,
});

const store = memoryStore([]);

const opened = (load: (path: string) => Promise<FigImport>) => async (path: string): Promise<LoadedFig> => ({ doc: await load(path), base });

const setup = (load: (path: string) => Promise<FigImport>) => {
  const sent: ImporterEvent[] = [];
  const written: string[] = [];
  const settled: { doc: FigImport; afterEvents: number }[] = [];
  const settle = (loaded: FigImport): void => {
    settled.push({ doc: loaded, afterEvents: sent.length });
  };
  return { sent, settled, written, handle: createImporterHandler({ send: (event) => sent.push(event), load: opened(load), store: memoryStore(written), settle }) };
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
      { type: "ready", pages: [], restored },
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
      load: async () => ({ doc, base }),
      store,
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
      load: async () => ({ doc, base }),
      store,
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
    const { sent, written, handle } = setup(async () => editable);
    await handle({ type: "load", path: "a.fig" });
    await handle({ type: "edit", reqId: 1, edit: { target: ["1:2"], style: { width: 140 } } });
    expect(nodes.get("1:2")?.style.width).toBe(140);
    await handle({ type: "undo", reqId: 2 });
    expect(nodes.get("1:2")).toBe(frame);
    await handle({ type: "undo", reqId: 3 });
    await handle({ type: "redo", reqId: 4 });
    await handle({ type: "edit", reqId: 5, edit: { target: ["9:9"], style: { width: 1 } } });
    const changes = [{ screenId: "1:2", target: ["1:2"] }];
    expect(sent.slice(1)).toEqual([
      { type: "edited", reqId: 1, changes, top: { step: 1, origin: "user" }, dirty: true },
      { type: "edited", reqId: 2, changes, dirty: false },
      { type: "edited", reqId: 3, changes: [], dirty: false },
      { type: "edited", reqId: 4, changes, top: { step: 1, origin: "user" }, dirty: true },
      { type: "refused", request: "edit", reqId: 5, message: "invalid edit" },
    ]);
    expect(nodes.get("1:2")?.style.width).toBe(140);
    await handle({ type: "save", reqId: 6 });
    expect(sent.at(-1)).toEqual({ type: "saved", reqId: 6, dirty: false });
    expect(written.at(-1)).toContain('"width": 140');
  });

  it("applies an agent batch as one step, rejects a bad one whole and undoes only its own step", async () => {
    const title: DesignNode = { id: "1:3", name: "Title", kind: "text", children: [], style: {}, text: "Hello", parentId: "1:2" };
    const frame: DesignNode = { id: "1:2", name: "Screen", kind: "frame", children: ["1:3"], style: { width: 100 } };
    const nodes = new Map<NodeId, DesignNode>([[frame.id, frame], [title.id, title]]);
    const editable: FigImport = { document: { nodes, pages: [{ id: "0:1", name: "Page", screens: [{ id: "1:2", name: "Screen", x: 0, y: 0, width: 100, height: 50 }] }] }, images: new Map() };
    const { sent, handle } = setup(async () => editable);
    await handle({ type: "load", path: "a.fig" });
    await handle({ type: "batch", reqId: 1, edits: [{ target: ["1:3"], text: "Bye" }, { target: ["9:9"], text: "x" }], origin: "agent", affectsInstances: false });
    expect(sent.at(-1)).toEqual({ type: "rejected", reqId: 1, index: 1, reason: "no node at this address" });
    expect(nodes.get("1:3")).toBe(title);
    await handle({ type: "batch", reqId: 2, edits: [{ target: ["1:3"], text: "Bye" }, { target: ["1:2"], style: { width: 140 } }], origin: "agent", affectsInstances: false });
    expect(sent.at(-1)).toEqual({
      type: "edited",
      reqId: 2,
      changes: [{ screenId: "1:2", target: ["1:3"] }, { screenId: "1:2", target: ["1:2"] }],
      top: { step: 1, origin: "agent" },
      dirty: true,
    });
    await handle({ type: "outline", reqId: 3, address: ["1:2"], limit: 10 });
    expect(sent.at(-1)).toMatchObject({ type: "outlined", reqId: 3, text: expect.stringContaining('1:3 "Title" text') });
    await handle({ type: "undo", reqId: 4, origin: "agent" });
    expect(sent.at(-1)).toEqual({ type: "edited", reqId: 4, changes: [{ screenId: "1:2", target: ["1:3"] }, { screenId: "1:2", target: ["1:2"] }], dirty: false });
    expect([nodes.get("1:3"), nodes.get("1:2")]).toEqual([title, frame]);
    await handle({ type: "undo", reqId: 5, origin: "agent" });
    expect(sent.at(-1)).toEqual({ type: "refused", request: "undo", reqId: 5, message: "nothing to undo" });
  });
});
