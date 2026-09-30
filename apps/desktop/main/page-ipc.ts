import { ipcMain } from "electron";
import { PAGE_CHANNEL } from "../shared/api";
import { isAppUrl } from "./windows";

export const registerPageIpc = (activate: (pageId: string) => void): void => {
  ipcMain.on(PAGE_CHANNEL, (event, pageId: unknown) => {
    if (isAppUrl(event.senderFrame?.url ?? "") && typeof pageId === "string") activate(pageId);
  });
};
