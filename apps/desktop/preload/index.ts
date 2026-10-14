import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { ImportProgress } from "@fignya/fig-import";
import {
  AGENT_FOCUS_CHANNEL,
  AGENT_STATUS_CHANNEL,
  CANVAS_ZOOM_CHANNEL,
  CHANGED_CHANNEL,
  DOCUMENT_CHANNEL,
  EDIT_CHANNEL,
  EXPORT_AVAILABLE_CHANNEL,
  EXPORT_CHANNEL,
  EXPORT_FAILED_CHANNEL,
  EXPORT_IMAGES_CHANNEL,
  EXPORT_REQUEST_CHANNEL,
  FOCUS_CHANNEL,
  FONT_CHANGED_CHANNEL,
  FONT_DOWNLOAD_CHANNEL,
  FONT_FACES_CHANNEL,
  FONT_UNAVAILABLE_CHANNEL,
  FONT_USAGE_CHANNEL,
  HISTORY_CHANNEL,
  LOST_CHANNEL,
  PAGE_CHANNEL,
  PLAY_AVAILABLE_CHANNEL,
  PLAY_REQUEST_CHANNEL,
  PROGRESS_CHANNEL,
  SCREEN_CHANNEL,
  SEARCH_CHANNEL,
  THUMB_DONE_CHANNEL,
  THUMB_JOB_CHANNEL,
  VIEW_CHANNEL,
  type AgentFocus,
  type CanvasZoom,
  type DocumentChanged,
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
  search: (query) => ipcRenderer.invoke(SEARCH_CHANNEL, query),
  onThumbJob: (handler) => {
    ipcRenderer.on(THUMB_JOB_CHANNEL, (_event, job: ThumbJob) => handler(job));
  },
  thumbRendered: (id, box) => ipcRenderer.send(THUMB_DONE_CHANNEL, id, box),
  showPage: (pageId) => ipcRenderer.send(PAGE_CHANNEL, pageId),
  focusScreens: (focus) => ipcRenderer.send(FOCUS_CHANNEL, focus),
  documentFonts: () => ipcRenderer.invoke(FONT_USAGE_CHANNEL),
  fontFaces: () => ipcRenderer.invoke(FONT_FACES_CHANNEL),
  onFontFaces: subscribe<FontFaces>(FONT_CHANGED_CHANNEL),
  downloadFonts: (requests) => ipcRenderer.invoke(FONT_DOWNLOAD_CHANNEL, requests),
  unavailableFonts: () => ipcRenderer.invoke(FONT_UNAVAILABLE_CHANNEL),
  onCanvasZoom: subscribe<CanvasZoom>(CANVAS_ZOOM_CHANNEL),
  edit: (edit) => ipcRenderer.invoke(EDIT_CHANNEL, edit),
  onChanged: subscribe<DocumentChanged>(CHANGED_CHANNEL),
  step: (step) => ipcRenderer.send(HISTORY_CHANNEL, step),
  exportAvailable: (screenId) => ipcRenderer.send(EXPORT_AVAILABLE_CHANNEL, screenId),
  onExportRequest: subscribe<undefined>(EXPORT_REQUEST_CHANNEL),
  exportImages: (hashes) => ipcRenderer.invoke(EXPORT_IMAGES_CHANNEL, hashes),
  exportScreen: (bundle) => ipcRenderer.invoke(EXPORT_CHANNEL, bundle),
  exportFailed: (message) => ipcRenderer.send(EXPORT_FAILED_CHANNEL, message),
  playAvailable: (screenId) => ipcRenderer.send(PLAY_AVAILABLE_CHANNEL, screenId),
  onPlayRequest: subscribe<undefined>(PLAY_REQUEST_CHANNEL),
  reportView: (view) => ipcRenderer.send(VIEW_CHANNEL, view),
  onAgentFocus: subscribe<AgentFocus>(AGENT_FOCUS_CHANNEL),
  onAgentStatus: subscribe<boolean>(AGENT_STATUS_CHANNEL),
};

contextBridge.exposeInMainWorld("fignya", api);
