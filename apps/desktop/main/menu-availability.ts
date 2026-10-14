import { ipcMain, Menu } from "electron";
import { isAppUrl } from "./windows";

export const registerMenuAvailability = (channel: string, itemId: string): void => {
  ipcMain.on(channel, (event, screenId: unknown) => {
    if (!isAppUrl(event.senderFrame?.url ?? "")) return;
    const item = Menu.getApplicationMenu()?.getMenuItemById(itemId);
    if (item) item.enabled = typeof screenId === "string";
  });
};
