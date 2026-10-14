import { describe, expect, it, vi } from "vitest";
import { createDocumentEditor, type EditableDocument } from "../main/document-editor";
import type { Edited } from "../main/import-client";

const change = { screenId: "1:2", target: ["1:2"] };

const setup = (replies: Edited[], saved = false) => {
  const next = async (): Promise<Edited> => replies.shift() ?? { change: undefined, dirty: false };
  const doc: EditableDocument = { edit: next, undo: next, redo: next, save: vi.fn(async () => saved) };
  const applied = vi.fn();
  const dirty = vi.fn();
  return { doc, applied, dirty, editor: createDocumentEditor(Promise.resolve(doc), { applied, dirty }) };
};

describe("createDocumentEditor", () => {
  it("reports changes and the dirty state of edits", async () => {
    const { editor, applied, dirty } = setup([{ change, dirty: true }]);
    await editor.edit({ target: ["1:2"], style: { width: 1 } });
    expect(applied).toHaveBeenCalledWith(change);
    expect(dirty).toHaveBeenLastCalledWith(true);
    expect(editor.dirty()).toBe(true);
  });

  it("reports history steps only when they change something", async () => {
    const { editor, applied, dirty } = setup([{ change: undefined, dirty: true }, { change, dirty: false }]);
    editor.undo();
    await vi.waitFor(() => expect(dirty).toHaveBeenCalledTimes(1));
    expect(applied).not.toHaveBeenCalled();
    editor.redo();
    await vi.waitFor(() => expect(applied).toHaveBeenCalledWith(change));
    expect(editor.dirty()).toBe(false);
  });

  it("saves only a dirty document and takes the dirty state of the save", async () => {
    const { editor, doc, dirty } = setup([{ change, dirty: true }]);
    await editor.save();
    expect(doc.save).not.toHaveBeenCalled();
    await editor.edit({ target: ["1:2"], style: { width: 1 } });
    await editor.save();
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(dirty).toHaveBeenLastCalledWith(false);
    expect(editor.dirty()).toBe(false);
  });

  it("stays dirty when saving fails", async () => {
    const { editor, doc } = setup([{ change, dirty: true }]);
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
    land({ change, dirty: true });
    await editing;
    await saving;
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(dirty).toHaveBeenLastCalledWith(false);
  });
});
