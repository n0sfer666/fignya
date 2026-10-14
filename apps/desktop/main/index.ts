import { app, Menu, net } from "electron";
import { join } from "node:path";
import { CANVAS_ZOOM_CHANNEL, CHANGED_CHANNEL, EXPORT_REQUEST_CHANNEL, LOST_CHANNEL, PLAY_AVAILABLE_CHANNEL, PLAY_REQUEST_CHANNEL, PROGRESS_CHANNEL, type DocumentChanged } from "../shared/api";
import { startAgentBridge } from "./agent-bridge";
import { menuTemplate, PLAY_ITEM_ID, UNDO_AGENT_ITEM_ID } from "./app-menu";
import { byScreen } from "./changed-screens";
import { createDocumentEditor } from "./document-editor";
import { reportRestored } from "./restore-report";
import { bindDocumentSave } from "./save-binding";
import { registerEditIpc } from "./edit-ipc";
import { registerExportIpc } from "./export-ipc";
import { registerFontIpc } from "./font-ipc";
import { createFontLibrary } from "./font-library";
import { registerDocumentIpc } from "./ipc";
import { registerPageIpc } from "./page-ipc";
import { loadDocument, type LoadedDocument } from "./load-document";
import { registerMenuAvailability } from "./menu-availability";
import { registerScheme, serveAssets } from "./protocol";
import { createThumbnails } from "./thumbnails";
import { createWindow, loadPage } from "./windows";

const FIRST_PAINT_DELAY_MS = 100;

const FONT_FETCH_TIMEOUT_MS = 30_000;

registerScheme();

app.on("window-all-closed", () => undefined);

app.whenReady().then(() => {
  const mac = process.platform === "darwin";
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
  const fonts = createFontLibrary(join(app.getPath("userData"), "fonts"), (url) => net.fetch(url, { signal: AbortSignal.timeout(FONT_FETCH_TIMEOUT_MS) }));
  registerFontIpc(loaded, fonts);
  const thumbnails = createThumbnails(loaded, join(app.getPath("userData"), "thumbs"), async () => (await fonts.faces()).version);
  registerPageIpc(thumbnails);
  const editor = createDocumentEditor(loaded, {
    applied: (changes, origin) => {
      thumbnails.touched();
      for (const [screenId, targets] of byScreen(changes)) {
        const changed: DocumentChanged = { screenId, targets, revision: thumbnails.changed(screenId), origin };
        toWindow(CHANGED_CHANNEL, changed);
      }
    },
    dirty: (dirty) => {
      if (mac && !window.isDestroyed()) window.setDocumentEdited(dirty);
    },
    top: (top) => {
      const item = Menu.getApplicationMenu()?.getMenuItemById(UNDO_AGENT_ITEM_ID);
      if (item) item.enabled = top?.origin === "agent";
    },
  });
  registerEditIpc(editor);
  const save = bindDocumentSave(window, loaded, editor);
  loaded.then((doc) => reportRestored(window, doc)).catch(() => undefined);
  registerExportIpc(window, loaded, fonts);
  registerMenuAvailability(PLAY_AVAILABLE_CHANNEL, PLAY_ITEM_ID);
  const exportScreen = (): void => toWindow(EXPORT_REQUEST_CHANNEL, undefined);
  const play = (): void => toWindow(PLAY_REQUEST_CHANNEL, undefined);
  const mcp = startAgentBridge({ window, loaded, editor, thumbnails, send: toWindow });
  const logged = (run: () => Promise<void>) => (): void => {
    run().catch((error: unknown) => console.error(`fignya: mcp: ${String(error)}`));
  };
  app.on("will-quit", logged(mcp.stop));
  const history = { undo: editor.undo, redo: editor.redo, undoAgent: logged(async () => void (await editor.undoAgent())) };
  const mcpMenu = { toggle: (enabled: boolean) => logged(() => mcp.toggle(enabled))(), copyCommand: logged(mcp.copyCommand), resetToken: logged(mcp.resetToken) };
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate((zoom) => toWindow(CANVAS_ZOOM_CHANNEL, zoom), mac, history, save, exportScreen, play, mcpMenu)));
  logged(mcp.start)();
  serveAssets(async (asset) => {
    if (asset.kind === "image") return (await loaded).image(asset.id);
    if (asset.kind === "font") return fonts.read(asset.id);
    return thumbnails.image(asset.id, asset.tier);
  });
  loadPage(window, "index").catch((error: unknown) => console.error(`fignya: main window failed to load: ${String(error)}`));
});
