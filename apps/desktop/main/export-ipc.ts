import { dialog, ipcMain, Menu, shell, type BrowserWindow } from "electron";
import { join } from "node:path";
import { EXPORT_AVAILABLE_CHANNEL, EXPORT_CHANNEL, EXPORT_FAILED_CHANNEL, EXPORT_IMAGES_CHANNEL } from "../shared/api";
import { errorMessage } from "../shared/error-message";
import type { ExportResult, ImageFiles, ScreenExport } from "../shared/export";
import { EXPORT_ITEM_ID } from "./app-menu";
import { exportFiles } from "./export-files";
import { imageHashList, isScreenExport } from "./export-guards";
import { exportFolderName } from "./export-folder-name";
import { createImageStage, type ImageStage } from "./export-image-stage";
import { writeExport } from "./export-writer";
import type { FontLibrary } from "./font-library";
import { assertApp } from "./ipc";
import type { LoadedDocument } from "./load-document";
import { isAppUrl } from "./windows";

const MAX_MESSAGE_LENGTH = 2000;

const failed = (message: string): void => dialog.showErrorBox("Export failed", message.slice(0, MAX_MESSAGE_LENGTH));

const screenName = (doc: LoadedDocument, id: string): string => doc.pages.flatMap((p) => p.screens).find((s) => s.id === id)?.name ?? id;

const save = async (window: BrowserWindow, doc: LoadedDocument, fonts: FontLibrary, images: ImageStage, bundle: ScreenExport): Promise<ExportResult> => {
  const { canceled, filePath } = await dialog.showSaveDialog(window, { title: "Export Screen", buttonLabel: "Export", defaultPath: exportFolderName(screenName(doc, bundle.screenId)) });
  if (canceled || !filePath) return "canceled";
  try {
    await writeExport(filePath, await exportFiles(bundle, { image: images.image, faces: async () => (await fonts.faces()).faces, font: fonts.read }));
  } catch (error) {
    failed(errorMessage(error));
    return "failed";
  }
  shell.showItemInFolder(join(filePath, "index.html"));
  return "saved";
};

export const registerExportIpc = (window: BrowserWindow, loaded: Promise<LoadedDocument>, fonts: FontLibrary): void => {
  const images = createImageStage(async (hash) => (await loaded).image(hash));
  ipcMain.on(EXPORT_AVAILABLE_CHANNEL, (event, screenId: unknown) => {
    if (!isAppUrl(event.senderFrame?.url ?? "")) return;
    const item = Menu.getApplicationMenu()?.getMenuItemById(EXPORT_ITEM_ID);
    if (item) item.enabled = typeof screenId === "string";
  });
  ipcMain.on(EXPORT_FAILED_CHANNEL, (event, message: unknown) => {
    if (!isAppUrl(event.senderFrame?.url ?? "")) return;
    images.clear();
    failed(typeof message === "string" ? message : "unknown error");
  });
  ipcMain.handle(EXPORT_IMAGES_CHANNEL, async (event, hashes: unknown): Promise<ImageFiles> => {
    assertApp(event);
    const list = imageHashList(hashes);
    if (!list) throw new Error("fignya: malformed image list");
    return images.stage(list);
  });
  ipcMain.handle(EXPORT_CHANNEL, async (event, bundle: unknown): Promise<ExportResult> => {
    assertApp(event);
    if (!isScreenExport(bundle)) throw new Error("fignya: malformed export");
    try {
      return await save(window, await loaded, fonts, images, bundle);
    } finally {
      images.clear();
    }
  });
};
