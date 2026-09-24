import { app } from "electron";
import { join } from "node:path";
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
  const loaded: Promise<LoadedDocument> = painted.then(() => loadDocument(process.env.FIG_FILE));
  loaded.catch((error: unknown) => console.error(`fignya: ${String(error)}`));
  registerDocumentIpc(loaded);
  const thumbnails = createThumbnails(loaded, join(app.getPath("userData"), "thumbs"));
  serveAssets(async (asset) => (asset.kind === "image" ? (await loaded).images.get(asset.id) : thumbnails(asset.id)));
  loadPage(window, "index").catch((error: unknown) => console.error(`fignya: main window failed to load: ${String(error)}`));
});
