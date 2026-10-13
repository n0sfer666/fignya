import type { MenuItemConstructorOptions } from "electron";
import { describe, expect, it, vi } from "vitest";
import { editItems, EXPORT_ITEM_ID, exportItems, menuTemplate, zoomItems } from "../main/app-menu";
import type { CanvasZoom } from "../shared/api";

const NO_HISTORY = { undo: () => undefined, redo: () => undefined };

const NO_EXPORT = (): void => undefined;

const PAGE_ZOOM_ROLES = new Set(["zoomIn", "zoomOut", "resetZoom", "viewMenu"]);

const flat = (items: MenuItemConstructorOptions[]): MenuItemConstructorOptions[] =>
  items.flatMap((item) => [item, ...(Array.isArray(item.submenu) ? flat(item.submenu) : [])]);

const sent = (accelerator: string): CanvasZoom[] => {
  const send = vi.fn<(zoom: CanvasZoom) => void>();
  for (const item of zoomItems(send)) if (item.accelerator === accelerator) item.click();
  return send.mock.calls.map(([zoom]) => zoom);
};

describe("menuTemplate", () => {
  it("has no page zoom, so the thumbnail window sharing the origin is never zoomed", () => {
    const roles = flat(menuTemplate(() => undefined, true, NO_HISTORY, NO_EXPORT)).map((item) => item.role);
    expect(roles.filter((role) => role !== undefined && PAGE_ZOOM_ROLES.has(role))).toEqual([]);
  });

  it("puts the zoom shortcuts into the menu", () => {
    const accelerators = flat(menuTemplate(() => undefined, true, NO_HISTORY, NO_EXPORT)).map((item) => item.accelerator);
    expect(zoomItems(() => undefined).every((item) => accelerators.includes(item.accelerator))).toBe(true);
  });

  it("sends canvas zoom steps from the zoom shortcuts", () => {
    expect(sent("CmdOrCtrl+Plus")).toEqual(["in"]);
    expect(sent("CmdOrCtrl+=")).toEqual(["in"]);
    expect(sent("CmdOrCtrl+-")).toEqual(["out"]);
    expect(sent("CmdOrCtrl+0")).toEqual(["actual"]);
  });

  it("undoes and redoes from the menu, leaving the shortcuts to the page", () => {
    const undo = vi.fn<() => void>();
    const redo = vi.fn<() => void>();
    const items = editItems({ undo, redo });
    items.find((item) => item.accelerator === "CmdOrCtrl+Z")?.click();
    items.find((item) => item.accelerator === "Shift+CmdOrCtrl+Z")?.click();
    expect([undo.mock.calls.length, redo.mock.calls.length]).toEqual([1, 1]);
    expect(items.every((item) => item.registerAccelerator === false)).toBe(true);
    const roles = flat(menuTemplate(() => undefined, true, { undo, redo }, NO_EXPORT)).map((item) => item.role);
    expect(roles).not.toContain("undo");
    expect(roles).not.toContain("redo");
    expect(roles).toEqual(expect.arrayContaining(["cut", "copy", "paste", "selectAll"]));
  });

  it("adds the app menu only on macOS", () => {
    expect(menuTemplate(() => undefined, true, NO_HISTORY, NO_EXPORT)[0]?.role).toBe("appMenu");
    expect(menuTemplate(() => undefined, false, NO_HISTORY, NO_EXPORT).some((item) => item.role === "appMenu")).toBe(false);
  });

  it("exports the open screen from File, disabled until a screen opens", () => {
    const run = vi.fn<() => void>();
    const [item] = exportItems(run);
    item?.click();
    expect(run).toHaveBeenCalledTimes(1);
    expect(item).toMatchObject({ id: EXPORT_ITEM_ID, accelerator: "CmdOrCtrl+E", enabled: false });
    const file = menuTemplate(() => undefined, false, NO_HISTORY, run).find((i) => i.label === "File");
    expect(flat([file ?? {}]).some((i) => i.id === EXPORT_ITEM_ID)).toBe(true);
  });
});
