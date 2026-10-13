import { describe, expect, it } from "vitest";
import { isImporterEvent, isImporterRequest } from "../importer/protocol-guards";

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
    expect(isImporterEvent({ type: "ready", pages: [] })).toBe(true);
    expect(isImporterEvent({ type: "failed", message: "x" })).toBe(true);
    expect(isImporterEvent({ type: "fonts", fonts: [] })).toBe(true);
    expect(isImporterEvent({ type: "fonts", fonts: [{ family: "Inter", nodes: 2, faces: [{ weight: 400, italic: false }] }] })).toBe(true);
    expect(isImporterEvent({ type: "screen", reqId: 1, model: undefined })).toBe(true);
    expect(isImporterEvent({ type: "image", reqId: 1, bytes: new Uint8Array() })).toBe(true);
    expect(isImporterEvent({ type: "refused", request: "screen", reqId: 1, message: "x" })).toBe(true);
    expect(isImporterEvent({ type: "found", reqId: 1, hits: [] })).toBe(true);
    expect(isImporterEvent({ type: "refused", request: "search", reqId: 1, message: "x" })).toBe(true);
    expect(isImporterEvent({ type: "edited", reqId: 1, change: { screenId: "1:2", target: ["1:2"] } })).toBe(true);
    expect(isImporterEvent({ type: "edited", reqId: 1, change: undefined })).toBe(true);
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
    expect(isImporterEvent({ type: "edited", reqId: 1, change: "1:2" })).toBe(false);
    expect(isImporterEvent({ type: "edited", reqId: 1, change: { screenId: 1, target: ["1:2"] } })).toBe(false);
    expect(isImporterEvent({ type: "edited", reqId: 1, change: { screenId: "1:2", target: [2] } })).toBe(false);
    expect(isImporterEvent({ type: "edited", reqId: 1, change: { screenId: "1:2" } })).toBe(false);
  });
});
