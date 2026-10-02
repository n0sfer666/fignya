import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { ImportProgress } from "@fignya/fig-import";
import {
  DOCUMENT_CHANNEL,
  FONT_CHANGED_CHANNEL,
  FONT_DOWNLOAD_CHANNEL,
  FONT_FACES_CHANNEL,
  FONT_UNAVAILABLE_CHANNEL,
  FONT_USAGE_CHANNEL,
  LOST_CHANNEL,
  PAGE_CHANNEL,
  PROGRESS_CHANNEL,
  SCREEN_CHANNEL,
  THUMB_DONE_CHANNEL,
  THUMB_JOB_CHANNEL,
  type FignyaApi,
  type ThumbJob,
} from "../shared/api";
import type { FontFaces } from "../shared/fonts";

const subscribe =
  <T>(channel: string) =>
  (handler: (payload: T) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, payload: T): void => handler(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  };

const api: FignyaApi = {
  documentState: () => ipcRenderer.invoke(DOCUMENT_CHANNEL),
  onProgress: subscribe<ImportProgress>(PROGRESS_CHANNEL),
  onLost: subscribe<string>(LOST_CHANNEL),
  screen: (id) => ipcRenderer.invoke(SCREEN_CHANNEL, id),
  onThumbJob: (handler) => {
    ipcRenderer.on(THUMB_JOB_CHANNEL, (_event, job: ThumbJob) => handler(job));
  },
  thumbRendered: (id) => ipcRenderer.send(THUMB_DONE_CHANNEL, id),
  showPage: (pageId) => ipcRenderer.send(PAGE_CHANNEL, pageId),
  documentFonts: () => ipcRenderer.invoke(FONT_USAGE_CHANNEL),
  fontFaces: () => ipcRenderer.invoke(FONT_FACES_CHANNEL),
  onFontFaces: subscribe<FontFaces>(FONT_CHANGED_CHANNEL),
  downloadFonts: (requests) => ipcRenderer.invoke(FONT_DOWNLOAD_CHANNEL, requests),
  unavailableFonts: () => ipcRenderer.invoke(FONT_UNAVAILABLE_CHANNEL),
};

contextBridge.exposeInMainWorld("fignya", api);
