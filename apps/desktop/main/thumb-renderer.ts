import { ipcMain, type IpcMainEvent, type NativeImage } from "electron";
import { THUMB_DONE_CHANNEL, THUMB_JOB_CHANNEL, type ThumbJob } from "../shared/api";
import { retrying } from "./retrying";
import { createWindow, loadPage } from "./windows";

const CAPTURE_TIMEOUT_MS = 15000;
const CAPTURE_ATTEMPTS = 3;
const CAPTURE_RETRY_MS = 100;

export type ThumbRenderer = (job: Omit<ThumbJob, "id">, width: number, height: number, renderTimeoutMs: number) => Promise<NativeImage>;

type Waiting = { id: number; resolve: () => void; reject: (error: Error) => void };

const withTimeout = <T>(promise: Promise<T>, ms: number, what: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`thumbnail ${what} timed out after ${ms} ms`)), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const createThumbRenderer = async (onGone: () => void): Promise<ThumbRenderer> => {
  const window = createWindow({ show: false, width: 400, height: 400, useContentSize: true, transparent: true, backgroundColor: "#00000000", webPreferences: { offscreen: true, backgroundThrottling: false } });
  let waiting: Waiting | undefined;
  let lastId = 0;
  let disposed = false;
  const done = (event: IpcMainEvent, id: unknown): void => {
    if (event.sender === window.webContents && waiting && id === waiting.id) waiting.resolve();
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    ipcMain.removeListener(THUMB_DONE_CHANNEL, done);
    waiting?.reject(new Error("thumbnail renderer is gone"));
    if (!window.isDestroyed()) window.destroy();
    onGone();
  };
  const guarded = async <T>(step: Promise<T>, ms: number, what: string): Promise<T> => {
    try {
      return await withTimeout(step, ms, what);
    } catch (error) {
      dispose();
      throw error;
    }
  };
  const captureOnce = async (width: number, height: number): Promise<NativeImage> => {
    if (disposed) throw new Error("thumbnail renderer is gone");
    const image = await window.webContents.capturePage({ x: 0, y: 0, width, height });
    if (image.isEmpty()) throw new Error("thumbnail capture is empty");
    return image;
  };
  ipcMain.on(THUMB_DONE_CHANNEL, done);
  window.webContents.once("render-process-gone", dispose);
  await loadPage(window, "thumb").catch((error: unknown) => {
    dispose();
    throw error;
  });
  return async (job, width, height, renderTimeoutMs) => {
    if (disposed) throw new Error("thumbnail renderer is gone");
    lastId += 1;
    const id = lastId;
    window.setContentSize(width, height);
    const rendered = new Promise<void>((resolve, reject) => {
      waiting = { id, resolve, reject };
    });
    window.webContents.send(THUMB_JOB_CHANNEL, { ...job, id });
    try {
      await guarded(rendered, renderTimeoutMs, "render");
    } finally {
      waiting = undefined;
    }
    const captured = retrying(CAPTURE_ATTEMPTS, () => captureOnce(width, height), () => delay(CAPTURE_RETRY_MS));
    return guarded(captured, CAPTURE_TIMEOUT_MS, "capture");
  };
};
