import { ipcMain } from "electron";
import { EDIT_CHANNEL, HISTORY_CHANNEL } from "../shared/api";
import type { DocumentEditor } from "./document-editor";
import { isEdit } from "./edit-guards";
import { assertApp } from "./ipc";
import { isAppUrl } from "./windows";

export const registerEditIpc = (editor: DocumentEditor): void => {
  ipcMain.handle(EDIT_CHANNEL, (event, edit: unknown): Promise<void> => {
    assertApp(event);
    if (!isEdit(edit)) throw new Error("fignya: malformed edit");
    return editor.edit(edit);
  });
  ipcMain.on(HISTORY_CHANNEL, (event, step: unknown) => {
    if (!isAppUrl(event.senderFrame?.url ?? "")) return;
    if (step === "undo") editor.undo();
    else if (step === "redo") editor.redo();
  });
};
