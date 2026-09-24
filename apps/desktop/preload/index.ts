import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { ImportProgress } from "@fignya/fig-import";
import { DOCUMENT_CHANNEL, LOST_CHANNEL, PROGRESS_CHANNEL, SCREEN_CHANNEL, THUMB_DONE_CHANNEL, THUMB_JOB_CHANNEL, type FignyaApi, type ThumbJob } from "../shared/api";

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
};

contextBridge.exposeInMainWorld("fignya", api);
