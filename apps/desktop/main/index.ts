import { app } from "electron";
import { join } from "node:path";
import { LOST_CHANNEL, PROGRESS_CHANNEL } from "../shared/api";
import { registerDocumentIpc } from "./ipc";
import { loadDocument, type LoadedDocument } from "./load-document";
import { registerScheme, serveAssets } from "./protocol";
import { createThumbnails } from "./thumbnails";
import { createWindow, loadPage } from "./windows";

const FIRST_PAINT_DELAY_MS = 100;

registerScheme();

app.on("window-all-closed", () => undefined);

app.whenReady().then(() => {
  const window = createWindow({ width: 1440, height: 900, show: false, backgroundColor: "#1e1e1e", title: "fignya" });
  window.once("ready-to-show", () => window.show());
  window.on("closed", () => app.quit());
  const painted = new Promise<void>((resolve) => window.webContents.once("did-finish-load", () => setTimeout(resolve, FIRST_PAINT_DELAY_MS)));
  const toWindow = (channel: string, payload: unknown): void => {
    if (!window.isDestroyed()) window.webContents.send(channel, payload);
  };
  const loaded: Promise<LoadedDocument> = painted.then(() =>
    loadDocument(process.env.FIG_FILE, {
      progress: (progress) => toWindow(PROGRESS_CHANNEL, progress),
      lost: (message) => {
        console.error(`fignya: ${message}`);
        toWindow(LOST_CHANNEL, message);
      },
    }),
  );
  loaded.catch((error: unknown) => console.error(`fignya: ${String(error)}`));
  registerDocumentIpc(loaded);
  const thumbnails = createThumbnails(loaded, join(app.getPath("userData"), "thumbs"));
  serveAssets(async (asset) => (asset.kind === "image" ? (await loaded).image(asset.id) : thumbnails(asset.id)));
  loadPage(window, "index").catch((error: unknown) => console.error(`fignya: main window failed to load: ${String(error)}`));
});
