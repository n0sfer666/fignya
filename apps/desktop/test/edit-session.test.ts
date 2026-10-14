import { describe, expect, it, vi } from "vitest";
import type { DesignNode, Edit, NodeId } from "@fignya/model";
import { openEditSession } from "../importer/edit-session";
import { parseSidecar, serializeSidecar, type BaseFingerprint } from "../importer/sidecar-format";
import type { SidecarStore } from "../importer/sidecar-store";

const base: BaseFingerprint = { size: 10, sha256: "ab".repeat(32) };
const frame: DesignNode = { id: "f", name: "f", kind: "frame", children: [], style: { width: 100 } };
const wide: Edit = { target: ["f"], style: { width: 140 } };

const nodesOf = () => new Map<NodeId, DesignNode>([[frame.id, frame]]);

const memoryStore = (initial?: string) => {
  const log: string[] = [];
  let text = initial;
  const store: SidecarStore = {
    read: async () => text,
    write: async (next) => {
      log.push("write");
      text = next;
    },
    backup: async () => {
      log.push("backup");
      text = undefined;
    },
  };
  return { store, log, text: () => text };
};

const saved = (edits: Edit[], fingerprint = base): string => serializeSidecar({ base: fingerprint, edits });

describe("openEditSession", () => {
  it("starts clean without a sidecar, gets dirty on edit and clean again on undo", async () => {
    const session = await openEditSession(nodesOf(), base, memoryStore().store);
    expect(session.restored).toEqual({ edits: 0, skipped: 0, stale: false, key: "" });
    expect(session.dirty()).toBe(false);
    expect(session.step({ type: "edit", reqId: 1, edit: wide })).toEqual([["f"]]);
    expect(session.dirty()).toBe(true);
    session.step({ type: "undo", reqId: 2 });
    expect(session.dirty()).toBe(false);
  });

  it("refuses an edit that does not fit the document", async () => {
    const session = await openEditSession(nodesOf(), base, memoryStore().store);
    expect(() => session.step({ type: "edit", reqId: 1, edit: { target: ["x"], style: { width: 1 } } })).toThrow("invalid edit");
  });

  it("saves the compacted edits with the base and stays clean", async () => {
    const memory = memoryStore();
    const session = await openEditSession(nodesOf(), base, memory.store);
    session.step({ type: "edit", reqId: 1, edit: { target: ["f"], style: { width: 120 } } });
    session.step({ type: "edit", reqId: 2, edit: wide });
    expect(await session.save()).toBe(false);
    expect(memory.log).toEqual(["write"]);
    expect(parseSidecar(memory.text() ?? "")).toEqual({ base, edits: [wide] });
  });

  it("restores saved edits outside the undo history", async () => {
    const nodes = nodesOf();
    const session = await openEditSession(nodes, base, memoryStore(saved([wide])).store);
    expect(nodes.get("f")?.style.width).toBe(140);
    expect(session.restored).toMatchObject({ edits: 1, skipped: 0, stale: false });
    expect(session.restored.key).toMatch(/^[0-9a-f]{16}$/);
    expect(session.step({ type: "undo", reqId: 1 })).toBeUndefined();
    expect(session.dirty()).toBe(false);
  });

  it("leaves the document alone and backs up once when the sidecar is stale", async () => {
    for (const text of [saved([wide], { ...base, size: 11 }), "{"]) {
      const nodes = nodesOf();
      const memory = memoryStore(text);
      const session = await openEditSession(nodes, base, memory.store);
      expect(nodes.get("f")).toBe(frame);
      expect(session.restored).toEqual({ edits: 0, skipped: 0, stale: true, key: "" });
      session.step({ type: "edit", reqId: 1, edit: wide });
      await session.save();
      await session.save();
      expect(memory.log).toEqual(["backup", "write", "write"]);
    }
  });

  it("treats an unreadable sidecar as stale", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store: SidecarStore = { ...memoryStore().store, read: async () => Promise.reject(new Error("EACCES")) };
    const session = await openEditSession(nodesOf(), base, store);
    expect(session.restored.stale).toBe(true);
    expect(logged).toHaveBeenCalledWith("fignya: importer: sidecar: EACCES");
    logged.mockRestore();
  });

  it("backs up before dropping edits that no longer fit", async () => {
    const memory = memoryStore(saved([wide, { target: ["gone"], style: { width: 1 } }]));
    const session = await openEditSession(nodesOf(), base, memory.store);
    expect(session.restored).toMatchObject({ edits: 1, skipped: 1, stale: false });
    await session.save();
    expect(memory.log).toEqual(["backup", "write"]);
  });

  it("writes saves in order and stays dirty for edits made while saving", async () => {
    const memory = memoryStore();
    const session = await openEditSession(nodesOf(), base, memory.store);
    session.step({ type: "edit", reqId: 1, edit: { target: ["f"], style: { width: 120 } } });
    const first = session.save();
    session.step({ type: "edit", reqId: 2, edit: wide });
    expect(await first).toBe(true);
    expect(await session.save()).toBe(false);
    expect(parseSidecar(memory.text() ?? "")?.edits).toEqual([wide]);
  });

  it("stays dirty when the write fails and saves on the next try", async () => {
    const memory = memoryStore();
    const write = vi.fn(memory.store.write).mockRejectedValueOnce(new Error("disk full"));
    const session = await openEditSession(nodesOf(), base, { ...memory.store, write });
    session.step({ type: "edit", reqId: 1, edit: wide });
    await expect(session.save()).rejects.toThrow("disk full");
    expect(session.dirty()).toBe(true);
    expect(await session.save()).toBe(false);
  });

  it("rejects an agent batch with the index of the edit that does not apply", async () => {
    const session = await openEditSession(nodesOf(), base, memoryStore().store);
    const edits = [wide, { target: ["x"], style: { width: 1 } }];
    expect(session.step({ type: "batch", reqId: 1, edits, origin: "agent", affectsInstances: false })).toEqual({ index: 1, reason: "the edit does not apply to this node" });
    expect(session.top()).toBeUndefined();
    expect(session.dirty()).toBe(false);
  });

  it("undoes only an agent batch on top of the history for the agent", async () => {
    const session = await openEditSession(nodesOf(), base, memoryStore().store);
    expect(() => session.step({ type: "undo", reqId: 1, origin: "agent" })).toThrow("nothing to undo");
    session.step({ type: "batch", reqId: 2, edits: [wide], origin: "agent", affectsInstances: false });
    expect(session.top()).toEqual({ step: 1, origin: "agent" });
    session.step({ type: "edit", reqId: 3, edit: { target: ["f"], style: { width: 120 } } });
    expect(() => session.step({ type: "undo", reqId: 4, origin: "agent" })).toThrow("the top of the history is a user edit");
    session.step({ type: "undo", reqId: 5 });
    expect(session.step({ type: "undo", reqId: 6, origin: "agent" })).toEqual([["f"]]);
    expect(session.top()).toBeUndefined();
    expect(session.dirty()).toBe(false);
  });
});
