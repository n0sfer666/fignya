import type { MenuItemConstructorOptions } from "electron";
import { describe, expect, it, vi } from "vitest";
import { editItems, EXPORT_ITEM_ID, exportItems, MCP_ITEM_ID, mcpItems, menuTemplate, PLAY_ITEM_ID, UNDO_AGENT_ITEM_ID, playItems, SAVE_ITEM_ID, saveItems, zoomItems } from "../main/app-menu";
import type { CanvasZoom } from "../shared/api";

const NO_HISTORY = { undo: () => undefined, redo: () => undefined, undoAgent: () => undefined };

const NO_MCP = { toggle: () => undefined, copyCommand: () => undefined, resetToken: () => undefined };

const NO_SAVE = (): void => undefined;

const NO_EXPORT = (): void => undefined;

const NO_PLAY = (): void => undefined;

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
    const roles = flat(menuTemplate(() => undefined, true, NO_HISTORY, NO_SAVE, NO_EXPORT, NO_PLAY, NO_MCP)).map((item) => item.role);
    expect(roles.filter((role) => role !== undefined && PAGE_ZOOM_ROLES.has(role))).toEqual([]);
  });

  it("puts the zoom shortcuts into the menu", () => {
    const accelerators = flat(menuTemplate(() => undefined, true, NO_HISTORY, NO_SAVE, NO_EXPORT, NO_PLAY, NO_MCP)).map((item) => item.accelerator);
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
    const items = editItems({ undo, redo, undoAgent: () => undefined });
    items.find((item) => item.accelerator === "CmdOrCtrl+Z")?.click();
    items.find((item) => item.accelerator === "Shift+CmdOrCtrl+Z")?.click();
    expect([undo.mock.calls.length, redo.mock.calls.length]).toEqual([1, 1]);
    expect(items.filter((item) => item.accelerator).every((item) => item.registerAccelerator === false)).toBe(true);
    const roles = flat(menuTemplate(() => undefined, true, { undo, redo, undoAgent: () => undefined }, NO_SAVE, NO_EXPORT, NO_PLAY, NO_MCP)).map((item) => item.role);
    expect(roles).not.toContain("undo");
    expect(roles).not.toContain("redo");
    expect(roles).toEqual(expect.arrayContaining(["cut", "copy", "paste", "selectAll"]));
  });

  it("adds the app menu only on macOS", () => {
    expect(menuTemplate(() => undefined, true, NO_HISTORY, NO_SAVE, NO_EXPORT, NO_PLAY, NO_MCP)[0]?.role).toBe("appMenu");
    expect(menuTemplate(() => undefined, false, NO_HISTORY, NO_SAVE, NO_EXPORT, NO_PLAY, NO_MCP).some((item) => item.role === "appMenu")).toBe(false);
  });

  it("exports the open screen from File, disabled until a screen opens", () => {
    const run = vi.fn<() => void>();
    const [item] = exportItems(run);
    item?.click();
    expect(run).toHaveBeenCalledTimes(1);
    expect(item).toMatchObject({ id: EXPORT_ITEM_ID, accelerator: "CmdOrCtrl+E", enabled: false });
    const file = menuTemplate(() => undefined, false, NO_HISTORY, NO_SAVE, run, NO_PLAY, NO_MCP).find((i) => i.label === "File");
    expect(flat([file ?? {}]).some((i) => i.id === EXPORT_ITEM_ID)).toBe(true);
  });

  it("plays the open screen from View, disabled until a screen opens, leaving the shortcut to the page", () => {
    const run = vi.fn<() => void>();
    const [item] = playItems(run);
    item?.click();
    expect(run).toHaveBeenCalledTimes(1);
    expect(item).toMatchObject({ id: PLAY_ITEM_ID, accelerator: "Alt+CmdOrCtrl+Enter", registerAccelerator: false, enabled: false });
    const view = menuTemplate(() => undefined, false, NO_HISTORY, NO_SAVE, NO_EXPORT, run, NO_MCP).find((i) => i.label === "View");
    expect(flat([view ?? {}]).some((i) => i.id === PLAY_ITEM_ID)).toBe(true);
  });

  it("saves the document from File with ⌘S", () => {
    const save = vi.fn();
    const file = menuTemplate(() => undefined, true, NO_HISTORY, save, NO_EXPORT, NO_PLAY, NO_MCP).find((item) => item.label === "File");
    const items = Array.isArray(file?.submenu) ? file.submenu : [];
    expect(items[0]).toMatchObject({ id: SAVE_ITEM_ID, label: "Save", accelerator: "CmdOrCtrl+S" });
    for (const item of saveItems(save)) item.click();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("undoes the agent batch from Edit, disabled until an agent batch is on top", () => {
    const undoAgent = vi.fn<() => void>();
    const item = editItems({ ...NO_HISTORY, undoAgent }).find((candidate) => candidate.id === UNDO_AGENT_ITEM_ID);
    item?.click();
    expect([item?.label, item?.enabled, item?.accelerator, undoAgent.mock.calls.length]).toEqual(["Undo Agent Edit", false, undefined, 1]);
  });

  it("controls the MCP server from File", () => {
    const mcp = { toggle: vi.fn<(enabled: boolean) => void>(), copyCommand: vi.fn<() => void>(), resetToken: vi.fn<() => void>() };
    const file = menuTemplate(() => undefined, true, NO_HISTORY, NO_SAVE, NO_EXPORT, NO_PLAY, mcp).find((item) => item.label === "File");
    const items = flat(Array.isArray(file?.submenu) ? file.submenu : []);
    expect(items.find((item) => item.id === MCP_ITEM_ID)).toMatchObject({ label: "Enable MCP Server", type: "checkbox", checked: false });
    for (const item of mcpItems(mcp)) item.click({ checked: true });
    expect([mcp.toggle.mock.calls, mcp.copyCommand.mock.calls.length, mcp.resetToken.mock.calls.length]).toEqual([[[true]], 1, 1]);
  });
});
