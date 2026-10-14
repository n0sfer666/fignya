import type { HistoryTop } from "@fignya/model";
import { describe, expect, it, vi } from "vitest";
import { createDocumentEditor, type EditableDocument } from "../main/document-editor";
import type { Edited, EditReply } from "../main/import-client";

const change = { screenId: "1:2", target: ["1:2"] };

const changes = [change];

const setup = (replies: EditReply[], saved = false) => {
  const reply = async (): Promise<EditReply> => replies.shift() ?? { changes: [], dirty: false };
  const next = async (): Promise<Edited> => {
    const answer = await reply();
    if ("index" in answer) throw new Error(answer.reason);
    return answer;
  };
  const doc: EditableDocument = { edit: next, batch: reply, undo: next, undoAgent: next, redo: next, save: vi.fn(async () => saved) };
  const applied = vi.fn();
  const dirty = vi.fn();
  const top = vi.fn();
  return { doc, applied, dirty, top, editor: createDocumentEditor(Promise.resolve(doc), { applied, dirty, top }) };
};

describe("createDocumentEditor", () => {
  it("reports changes and the dirty state of edits", async () => {
    const { editor, applied, dirty } = setup([{ changes, dirty: true }]);
    await editor.edit({ target: ["1:2"], style: { width: 1 } });
    expect(applied).toHaveBeenCalledWith(changes, "user");
    expect(dirty).toHaveBeenLastCalledWith(true);
    expect(editor.dirty()).toBe(true);
  });

  it("reports history steps only when they change something", async () => {
    const { editor, applied, dirty } = setup([{ changes: [], dirty: true }, { changes, dirty: false }]);
    editor.undo();
    await vi.waitFor(() => expect(dirty).toHaveBeenCalledTimes(1));
    expect(applied).not.toHaveBeenCalled();
    editor.redo();
    await vi.waitFor(() => expect(applied).toHaveBeenCalledWith(changes, "user"));
    expect(editor.dirty()).toBe(false);
  });

  it("saves only a dirty document and takes the dirty state of the save", async () => {
    const { editor, doc, dirty } = setup([{ changes, dirty: true }]);
    await editor.save();
    expect(doc.save).not.toHaveBeenCalled();
    await editor.edit({ target: ["1:2"], style: { width: 1 } });
    await editor.save();
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(dirty).toHaveBeenLastCalledWith(false);
    expect(editor.dirty()).toBe(false);
  });

  it("stays dirty when saving fails", async () => {
    const { editor, doc } = setup([{ changes, dirty: true }]);
    vi.mocked(doc.save).mockRejectedValueOnce(new Error("disk full"));
    await editor.edit({ target: ["1:2"], style: { width: 1 } });
    await expect(editor.save()).rejects.toThrow("disk full");
    expect(editor.dirty()).toBe(true);
  });

  it("is dirty while an edit is in flight and saves after it lands", async () => {
    let land: (edited: Edited) => void = () => undefined;
    const { doc, editor, dirty } = setup([]);
    doc.edit = () => new Promise<Edited>((resolve) => (land = resolve));
    const editing = editor.edit({ target: ["1:2"], style: { width: 1 } });
    expect(editor.dirty()).toBe(true);
    const saving = editor.save();
    await Promise.resolve();
    expect(doc.save).not.toHaveBeenCalled();
    land({ changes, dirty: true });
    await editing;
    await saving;
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(dirty).toHaveBeenLastCalledWith(false);
  });

  it("applies an agent batch as an agent step and reports the history top", async () => {
    const top: HistoryTop = { step: 3, origin: "agent" };
    const { editor, applied, top: reportTop } = setup([{ changes, top, dirty: true }]);
    expect(await editor.batch([{ target: ["1:2"], style: { width: 1 } }], false)).toEqual({ changes, top, dirty: true });
    expect(applied).toHaveBeenCalledWith(changes, "agent");
    expect(reportTop).toHaveBeenLastCalledWith(top);
  });

  it("passes a rejected batch back without touching the document state", async () => {
    const { editor, applied, dirty, top } = setup([{ index: 1, reason: "no node at this address" }]);
    expect(await editor.batch([], true)).toEqual({ index: 1, reason: "no node at this address" });
    expect([applied.mock.calls.length, dirty.mock.calls.length, top.mock.calls.length]).toEqual([0, 0, 0]);
    expect(editor.dirty()).toBe(false);
  });

  it("undoes the agent batch and reports the new top", async () => {
    const { editor, applied, top } = setup([{ changes, dirty: false }]);
    expect(await editor.undoAgent()).toEqual({ changes, dirty: false });
    expect(applied).toHaveBeenCalledWith(changes, "agent");
    expect(top).toHaveBeenLastCalledWith(undefined);
  });
});
