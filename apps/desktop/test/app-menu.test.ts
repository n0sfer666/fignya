import type { MenuItemConstructorOptions } from "electron";
import { describe, expect, it, vi } from "vitest";
import { menuTemplate, zoomItems } from "../main/app-menu";
import type { CanvasZoom } from "../shared/api";

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
    const roles = flat(menuTemplate(() => undefined, true)).map((item) => item.role);
    expect(roles.filter((role) => role !== undefined && PAGE_ZOOM_ROLES.has(role))).toEqual([]);
  });

  it("puts the zoom shortcuts into the menu", () => {
    const accelerators = flat(menuTemplate(() => undefined, true)).map((item) => item.accelerator);
    expect(zoomItems(() => undefined).every((item) => accelerators.includes(item.accelerator))).toBe(true);
  });

  it("sends canvas zoom steps from the zoom shortcuts", () => {
    expect(sent("CmdOrCtrl+Plus")).toEqual(["in"]);
    expect(sent("CmdOrCtrl+=")).toEqual(["in"]);
    expect(sent("CmdOrCtrl+-")).toEqual(["out"]);
    expect(sent("CmdOrCtrl+0")).toEqual(["actual"]);
  });

  it("adds the app menu only on macOS", () => {
    expect(menuTemplate(() => undefined, true)[0]?.role).toBe("appMenu");
    expect(menuTemplate(() => undefined, false).some((item) => item.role === "appMenu")).toBe(false);
  });
});
