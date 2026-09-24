import { contextBridge, ipcRenderer } from "electron";
import { DOCUMENT_CHANNEL, SCREEN_CHANNEL, THUMB_DONE_CHANNEL, THUMB_JOB_CHANNEL, type FignyaApi, type ThumbJob } from "../shared/api";

const api: FignyaApi = {
  documentState: () => ipcRenderer.invoke(DOCUMENT_CHANNEL),
  screen: (id) => ipcRenderer.invoke(SCREEN_CHANNEL, id),
  onThumbJob: (handler) => {
    ipcRenderer.on(THUMB_JOB_CHANNEL, (_event, job: ThumbJob) => handler(job));
  },
  thumbRendered: (id) => ipcRenderer.send(THUMB_DONE_CHANNEL, id),
};

contextBridge.exposeInMainWorld("fignya", api);
