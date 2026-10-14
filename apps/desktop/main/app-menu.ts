import type { MenuItemConstructorOptions } from "electron";
import type { CanvasZoom } from "../shared/api";

type SendZoom = (zoom: CanvasZoom) => void;

type ZoomItem = Pick<MenuItemConstructorOptions, "label" | "accelerator" | "visible" | "acceleratorWorksWhenHidden"> & { click: () => void };

const zoomItem = (label: string, accelerator: string, zoom: CanvasZoom, send: SendZoom, visible = true): ZoomItem => ({
  label,
  accelerator,
  visible,
  acceleratorWorksWhenHidden: true,
  click: () => send(zoom),
});

export const zoomItems = (send: SendZoom): ZoomItem[] => [
  zoomItem("Zoom to 100%", "CmdOrCtrl+0", "actual", send),
  zoomItem("Zoom In", "CmdOrCtrl+Plus", "in", send),
  zoomItem("Zoom In", "CmdOrCtrl+=", "in", send, false),
  zoomItem("Zoom Out", "CmdOrCtrl+-", "out", send),
];

export type DocumentHistory = { undo: () => void; redo: () => void };

type EditItem = Pick<MenuItemConstructorOptions, "label" | "accelerator" | "registerAccelerator"> & { click: () => void };

export const editItems = ({ undo, redo }: DocumentHistory): EditItem[] => [
  { label: "Undo", accelerator: "CmdOrCtrl+Z", registerAccelerator: false, click: undo },
  { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", registerAccelerator: false, click: redo },
];

export const SAVE_ITEM_ID = "save-document";

type SaveItem = Pick<MenuItemConstructorOptions, "id" | "label" | "accelerator"> & { click: () => void };

export const saveItems = (run: () => void): SaveItem[] => [{ id: SAVE_ITEM_ID, label: "Save", accelerator: "CmdOrCtrl+S", click: run }];

export const EXPORT_ITEM_ID = "export-screen";

type ExportItem = Pick<MenuItemConstructorOptions, "id" | "label" | "accelerator" | "enabled"> & { click: () => void };

export const exportItems = (run: () => void): ExportItem[] => [{ id: EXPORT_ITEM_ID, label: "Export Screen…", accelerator: "CmdOrCtrl+E", enabled: false, click: run }];

export const PLAY_ITEM_ID = "play-screen";

type PlayItem = Pick<MenuItemConstructorOptions, "id" | "label" | "accelerator" | "registerAccelerator" | "enabled"> & { click: () => void };

export const playItems = (run: () => void): PlayItem[] => [
  { id: PLAY_ITEM_ID, label: "Play", accelerator: "Alt+CmdOrCtrl+Enter", registerAccelerator: false, enabled: false, click: run },
];

export const menuTemplate = (
  send: SendZoom,
  mac: boolean,
  history: DocumentHistory,
  save: () => void,
  exportScreen: () => void,
  play: () => void,
): MenuItemConstructorOptions[] => [
  ...(mac ? [{ role: "appMenu" } satisfies MenuItemConstructorOptions] : []),
  { label: "File", submenu: [...saveItems(save), { type: "separator" }, ...exportItems(exportScreen)] },
  {
    label: "Edit",
    submenu: [...editItems(history), { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }],
  },
  {
    label: "View",
    submenu: [
      ...playItems(play),
      { type: "separator" },
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      ...zoomItems(send),
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
  { role: "windowMenu" },
];
