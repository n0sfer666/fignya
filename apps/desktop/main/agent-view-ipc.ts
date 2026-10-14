import { ipcMain } from "electron";
import { VIEW_CHANNEL, type AgentView } from "../shared/api";
import { pickAgentView } from "./agent-view";
import { isAppUrl } from "./windows";

export const registerAgentViewIpc = (): (() => AgentView) => {
  let view: AgentView = {};
  ipcMain.on(VIEW_CHANNEL, (event, next: unknown) => {
    if (!isAppUrl(event.senderFrame?.url ?? "")) return;
    view = pickAgentView(next) ?? view;
  });
  return () => view;
};
