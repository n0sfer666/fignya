import { BrowserWindow, ipcMain } from "electron";
import type { FontUsage } from "@fignya/fig-import";
import { FONT_CHANGED_CHANNEL, FONT_DOWNLOAD_CHANNEL, FONT_FACES_CHANNEL, FONT_USAGE_CHANNEL } from "../shared/api";
import type { FontDownload, FontFaces } from "../shared/fonts";
import type { FontLibrary } from "./font-library";
import { isFontRequests } from "./font-request-guards";
import { assertApp } from "./ipc";
import type { LoadedDocument } from "./load-document";
import { isAppUrl } from "./windows";

const broadcast = (faces: FontFaces): void => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && isAppUrl(window.webContents.getURL())) window.webContents.send(FONT_CHANGED_CHANNEL, faces);
  }
};

export const registerFontIpc = (loaded: Promise<LoadedDocument>, library: FontLibrary): void => {
  ipcMain.handle(FONT_USAGE_CHANNEL, async (event): Promise<FontUsage[]> => {
    assertApp(event);
    return (await loaded).fonts;
  });
  ipcMain.handle(FONT_FACES_CHANNEL, (event): Promise<FontFaces> => {
    assertApp(event);
    return library.faces();
  });
  ipcMain.handle(FONT_DOWNLOAD_CHANNEL, (event, requests: unknown): Promise<FontDownload[]> => {
    assertApp(event);
    if (!isFontRequests(requests)) throw new Error("fignya: malformed font request");
    return library.download(requests);
  });
  library.onChange(broadcast);
};
