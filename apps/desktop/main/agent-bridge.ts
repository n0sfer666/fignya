import { app, clipboard, dialog, Menu, type BrowserWindow } from "electron";
import { join } from "node:path";
import { AGENT_FOCUS_CHANNEL, AGENT_STATUS_CHANNEL } from "../shared/api";
import { MCP_ITEM_ID } from "./app-menu";
import { registerAgentViewIpc } from "./agent-view-ipc";
import type { DocumentEditor } from "./document-editor";
import type { LoadedDocument } from "./load-document";
import { createMcpControl, type McpControl } from "./mcp/control";
import { documentGate } from "./mcp/document-gate";
import { createMcpLog } from "./mcp/log";
import { mcpPort } from "./mcp/port";
import type { Thumbnails } from "./thumbnails";

export type AgentBridgeOptions = {
  window: BrowserWindow;
  loaded: Promise<LoadedDocument>;
  editor: DocumentEditor;
  thumbnails: Thumbnails;
  send: (channel: string, payload: unknown) => void;
};

const showDialog = (window: BrowserWindow, type: "warning" | "error", message: string, detail: string): void => {
  dialog.showMessageBox(window, { type, message, detail, buttons: ["OK"] }).catch(() => undefined);
};

export const startAgentBridge = ({ window, loaded, editor, thumbnails, send }: AgentBridgeOptions): McpControl => {
  const view = registerAgentViewIpc();
  let connected = false;
  window.webContents.on("did-finish-load", () => send(AGENT_STATUS_CHANNEL, connected));
  const userData = app.getPath("userData");
  return createMcpControl({
    configPath: join(userData, "mcp.json"),
    port: mcpPort(process.env.FIGNYA_MCP_PORT),
    version: app.getVersion(),
    deps: { doc: documentGate(loaded), editor, shot: thumbnails.shot, view, focus: (focus) => send(AGENT_FOCUS_CHANNEL, focus) },
    log: createMcpLog(join(userData, "logs", "mcp.log")),
    ui: {
      connected: (next) => {
        connected = next;
        send(AGENT_STATUS_CHANNEL, next);
      },
      enabled: (enabled) => {
        const item = Menu.getApplicationMenu()?.getMenuItemById(MCP_ITEM_ID);
        if (item) item.checked = enabled;
      },
      busy: (port) =>
        showDialog(window, "warning", `Port ${port} is already in use`, "The MCP server stays off. Quit the other fignya, or set FIGNYA_MCP_PORT to a free port."),
      failed: (message) => showDialog(window, "error", "The MCP server could not start", message),
      copy: (text) => clipboard.writeText(text),
    },
  });
};
