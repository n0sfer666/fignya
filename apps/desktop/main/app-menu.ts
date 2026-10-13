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

export const menuTemplate = (send: SendZoom, mac: boolean): MenuItemConstructorOptions[] => [
  ...(mac ? [{ role: "appMenu" } satisfies MenuItemConstructorOptions] : []),
  { role: "editMenu" },
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
