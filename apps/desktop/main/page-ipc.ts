import { ipcMain } from "electron";
import { FOCUS_CHANNEL, PAGE_CHANNEL } from "../shared/api";
import { isThumbFocus } from "./focus-guards";
import type { Thumbnails } from "./thumbnails";
import { isAppUrl } from "./windows";

export const registerPageIpc = (thumbnails: Pick<Thumbnails, "activate" | "focusScreens">): void => {
  ipcMain.on(PAGE_CHANNEL, (event, pageId: unknown) => {
    if (isAppUrl(event.senderFrame?.url ?? "") && typeof pageId === "string") thumbnails.activate(pageId);
  });
  ipcMain.on(FOCUS_CHANNEL, (event, focus: unknown) => {
    if (isAppUrl(event.senderFrame?.url ?? "") && isThumbFocus(focus)) thumbnails.focusScreens(focus);
  });
};
