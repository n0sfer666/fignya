import type { BrowserWindow } from "electron";
import { basename } from "node:path";
import { guardClose } from "./close-guard";
import { askClose, showSaveError } from "./document-dialogs";
import type { DocumentEditor } from "./document-editor";
import type { LoadedDocument } from "./load-document";

export const bindDocumentSave = (window: BrowserWindow, loaded: Promise<LoadedDocument>, editor: DocumentEditor): (() => void) => {
  const failed = (error: unknown): void => showSaveError(window, error);
  guardClose(window, editor, async () => askClose(window, basename((await loaded).path)), failed);
  return () => {
    editor.save().catch(failed);
  };
};
