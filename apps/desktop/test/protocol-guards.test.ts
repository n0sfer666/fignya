import { describe, expect, it } from "vitest";
import { isImporterEvent, isImporterRequest, refusalOf } from "../importer/protocol-guards";

describe("isImporterRequest", () => {
  it("accepts load and asset queries", () => {
    expect(isImporterRequest({ type: "load", path: "a.fig" })).toBe(true);
    expect(isImporterRequest({ type: "screen", reqId: 1, id: "1:2" })).toBe(true);
    expect(isImporterRequest({ type: "search", reqId: 2, query: "1:2" })).toBe(true);
  });

  it("accepts edits, undo and redo", () => {
    expect(isImporterRequest({ type: "edit", reqId: 1, edit: { target: ["1:2"], style: { width: 1 } } })).toBe(true);
    expect(isImporterRequest({ type: "undo", reqId: 2 })).toBe(true);
    expect(isImporterRequest({ type: "redo", reqId: 3 })).toBe(true);
    expect(isImporterRequest({ type: "edit", reqId: 4 })).toBe(false);
    expect(isImporterRequest({ type: "undo" })).toBe(false);
  });

  it("accepts agent queries", () => {
    expect(isImporterRequest({ type: "search", reqId: 1, query: "card", names: true })).toBe(true);
    expect(isImporterRequest({ type: "outline", reqId: 1, address: ["1:2"], limit: 50 })).toBe(true);
    expect(isImporterRequest({ type: "inspect", reqId: 1, address: ["1:2", "3:4"] })).toBe(true);
    expect(isImporterRequest({ type: "batch", reqId: 1, edits: [{ target: ["1:2"], text: "Hi" }], origin: "agent", affectsInstances: false })).toBe(true);
    expect(isImporterRequest({ type: "undo", reqId: 1, origin: "agent" })).toBe(true);
    expect(isImporterRequest({ type: "outline", reqId: 1, address: [], limit: 50 })).toBe(false);
    expect(isImporterRequest({ type: "inspect", reqId: 1, address: "1:2" })).toBe(false);
    expect(isImporterRequest({ type: "batch", reqId: 1, edits: [{ target: ["1:2"] }], origin: "agent", affectsInstances: false })).toBe(false);
    expect(isImporterRequest({ type: "batch", reqId: 1, edits: [], origin: "user", affectsInstances: false })).toBe(false);
    expect(isImporterRequest({ type: "undo", reqId: 1, origin: "user" })).toBe(false);
    expect(isImporterRequest({ type: "batch", reqId: 1, edits: [], origin: "agent", affectsInstances: false })).toBe(false);
    expect(isImporterRequest({ type: "inspect", reqId: 1, address: ["x".repeat(65)] })).toBe(false);
    expect(isImporterRequest({ type: "outline", reqId: 1, address: ["1:2"], limit: 0 })).toBe(false);
    expect(isImporterRequest({ type: "outline", reqId: 1, address: ["1:2"], limit: 1.5 })).toBe(false);
    expect(isImporterRequest({ type: "outline", reqId: 1, address: ["1:2"], limit: Infinity })).toBe(false);
    expect(isImporterRequest({ type: "batch", reqId: 1, edits: [{ target: ["x".repeat(65)], text: "Hi" }], origin: "agent", affectsInstances: false })).toBe(false);
  });

  it("refuses a malformed query that still names its request", () => {
    const refused = { type: "refused", request: "batch", reqId: 7, message: "invalid request" };
    expect(refusalOf({ type: "batch", reqId: 7, edits: [{ target: ["x".repeat(65)], text: "Hi" }] })).toEqual(refused);
    expect(refusalOf({ type: "batch", reqId: "7" })).toBeUndefined();
    expect(refusalOf({ type: "drop", reqId: 7 })).toBeUndefined();
    expect(refusalOf({ type: "load", reqId: 7 })).toBeUndefined();
  });

  it("accepts save", () => {
    expect(isImporterRequest({ type: "save", reqId: 1 })).toBe(true);
    expect(isImporterRequest({ type: "save" })).toBe(false);
  });

  it("rejects malformed requests", () => {
    expect(isImporterRequest(null)).toBe(false);
    expect(isImporterRequest({ type: "load" })).toBe(false);
    expect(isImporterRequest({ type: "image", reqId: "1", id: "x" })).toBe(false);
    expect(isImporterRequest({ type: "drop", reqId: 1, id: "x" })).toBe(false);
    expect(isImporterRequest({ type: "search", reqId: 1, id: "x" })).toBe(false);
    expect(isImporterRequest({ type: "search", query: "x" })).toBe(false);
  });
});

describe("isImporterEvent", () => {
  it("accepts every event kind", () => {
    expect(isImporterEvent({ type: "progress", progress: { phase: "decode", done: 0, total: 1 } })).toBe(true);
    expect(isImporterEvent({ type: "ready", pages: [], restored: { edits: 0, skipped: 0, stale: false, key: "" } })).toBe(true);
    expect(isImporterEvent({ type: "failed", message: "x" })).toBe(true);
    expect(isImporterEvent({ type: "fonts", fonts: [] })).toBe(true);
    expect(isImporterEvent({ type: "fonts", fonts: [{ family: "Inter", nodes: 2, faces: [{ weight: 400, italic: false }] }] })).toBe(true);
    expect(isImporterEvent({ type: "screen", reqId: 1, model: undefined })).toBe(true);
    expect(isImporterEvent({ type: "image", reqId: 1, bytes: new Uint8Array() })).toBe(true);
    expect(isImporterEvent({ type: "refused", request: "screen", reqId: 1, message: "x" })).toBe(true);
    expect(isImporterEvent({ type: "found", reqId: 1, hits: [] })).toBe(true);
    expect(isImporterEvent({ type: "refused", request: "search", reqId: 1, message: "x" })).toBe(true);
    expect(isImporterEvent({ type: "edited", reqId: 1, changes: [{ screenId: "1:2", target: ["1:2"] }], dirty: true })).toBe(true);
    expect(isImporterEvent({ type: "edited", reqId: 1, changes: [], top: { step: 2, origin: "agent" }, dirty: false })).toBe(true);
    expect(isImporterEvent({ type: "rejected", reqId: 1, index: 0, reason: "invalid address" })).toBe(true);
    expect(isImporterEvent({ type: "outlined", reqId: 1, text: "1:2 \"Screen\" frame" })).toBe(true);
    expect(isImporterEvent({ type: "outlined", reqId: 1, text: undefined })).toBe(true);
    expect(isImporterEvent({ type: "inspected", reqId: 1, details: undefined })).toBe(true);
    expect(isImporterEvent({ type: "refused", request: "batch", reqId: 1, message: "x" })).toBe(true);
    expect(isImporterEvent({ type: "saved", reqId: 1, dirty: false })).toBe(true);
    expect(isImporterEvent({ type: "refused", request: "save", reqId: 1, message: "x" })).toBe(true);
    expect(isImporterEvent({ type: "refused", request: "edit", reqId: 1, message: "x" })).toBe(true);
    expect(isImporterEvent({ type: "refused", request: "undo", reqId: 1, message: "x" })).toBe(true);
  });

  it("rejects unknown and malformed events", () => {
    expect(isImporterEvent({ type: "other" })).toBe(false);
    expect(isImporterEvent({ type: "image", reqId: 1, bytes: [1] })).toBe(false);
    expect(isImporterEvent({ type: "fonts", fonts: "Inter" })).toBe(false);
    expect(isImporterEvent({ type: "fonts", fonts: [{ family: 1, nodes: 1, faces: [] }] })).toBe(false);
    expect(isImporterEvent({ type: "fonts", fonts: [{ family: "Inter", nodes: 1, faces: [{ weight: "bold", italic: false }] }] })).toBe(false);
    expect(isImporterEvent({ type: "refused", request: "thumb", reqId: 1, message: "x" })).toBe(false);
    expect(isImporterEvent({ type: "found", reqId: 1, hits: "1:2" })).toBe(false);
    expect(isImporterEvent({ type: "ready", pages: [] })).toBe(false);
    expect(isImporterEvent({ type: "ready", pages: [], restored: { edits: 0, skipped: 0, stale: "no", key: "" } })).toBe(false);
    expect(isImporterEvent({ type: "edited", reqId: 1, changes: [] })).toBe(false);
    expect(isImporterEvent({ type: "edited", reqId: 1, changes: [], top: { step: 1, origin: "robot" }, dirty: true })).toBe(false);
    expect(isImporterEvent({ type: "rejected", reqId: 1, index: "0", reason: "x" })).toBe(false);
    expect(isImporterEvent({ type: "outlined", reqId: 1, text: 1 })).toBe(false);
    expect(isImporterEvent({ type: "saved", reqId: 1 })).toBe(false);
    expect(isImporterEvent({ type: "edited", reqId: 1, changes: "1:2", dirty: true })).toBe(false);
    expect(isImporterEvent({ type: "edited", reqId: 1, changes: [{ screenId: 1, target: ["1:2"] }], dirty: true })).toBe(false);
    expect(isImporterEvent({ type: "edited", reqId: 1, changes: [{ screenId: "1:2", target: [2] }], dirty: true })).toBe(false);
    expect(isImporterEvent({ type: "edited", reqId: 1, changes: [{ screenId: "1:2" }], dirty: true })).toBe(false);
  });
});
