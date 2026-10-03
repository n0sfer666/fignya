import { BrowserWindow, type BrowserWindowConstructorOptions } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export type RendererPage = "index" | "thumb";

const preload = join(__dirname, "../preload/index.js");
const rendererDir = join(__dirname, "../renderer");

const originOf = (url: string): string | undefined => {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
};

export const isAppUrl = (url: string): boolean => {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) return originOf(url) !== undefined && originOf(url) === originOf(devUrl);
  return url.startsWith(`${pathToFileURL(rendererDir).href}/`);
};

export const loadPage = (window: BrowserWindow, page: RendererPage): Promise<void> => {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  return devUrl ? window.loadURL(`${devUrl}/${page}.html`) : window.loadFile(join(rendererDir, `${page}.html`));
};

export const createWindow = (options: BrowserWindowConstructorOptions): BrowserWindow => {
  const window = new BrowserWindow({
    ...options,
    webPreferences: { ...options.webPreferences, preload, sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  window.webContents.on("will-navigate", (event) => {
    if (event.url !== window.webContents.getURL()) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("did-finish-load", () => window.webContents.setZoomLevel(0));
  return window;
};
