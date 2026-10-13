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

export const menuTemplate = (send: SendZoom, mac: boolean, history: DocumentHistory): MenuItemConstructorOptions[] => [
  ...(mac ? [{ role: "appMenu" } satisfies MenuItemConstructorOptions] : []),
  {
    label: "Edit",
    submenu: [...editItems(history), { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }],
  },
  {
    label: "View",
    submenu: [
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
