import { dialog, type BrowserWindow } from "electron";
import { errorMessage } from "../shared/error-message";
import type { CloseChoice } from "./close-guard";

const CHOICES: CloseChoice[] = ["save", "discard", "cancel"];

const shown = (box: Promise<unknown>): void => {
  box.catch((error: unknown) => console.error(`fignya: dialog failed: ${errorMessage(error)}`));
};

export const askClose = async (window: BrowserWindow, name: string): Promise<CloseChoice> => {
  const { response } = await dialog.showMessageBox(window, {
    type: "warning",
    buttons: ["Save", "Don't Save", "Cancel"],
    defaultId: 0,
    cancelId: 2,
    message: `Do you want to save the changes you made to “${name}”?`,
    detail: "Your changes will be lost if you don't save them.",
  });
  return CHOICES[response] ?? "cancel";
};

export const showSaveError = (window: BrowserWindow, error: unknown): void => {
  console.error(`fignya: save failed: ${errorMessage(error)}`);
  shown(dialog.showMessageBox(window, { type: "error", message: "Could not save changes", detail: errorMessage(error) }));
};

export const showRestoreWarning = (window: BrowserWindow, detail: string): void =>
  shown(dialog.showMessageBox(window, { type: "warning", message: "Not all saved changes were applied", detail }));
