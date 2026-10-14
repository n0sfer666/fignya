import type { Page } from "@fignya/model";
import type { AgentView } from "../../../shared/api";
import { textResult } from "../tool-result";
import { addressText } from "./address";
import { READ_ONLY, type RegisterTool } from "./tool";

const pageLines = (page: Page): string[] => [
  `page ${page.id} "${page.name}"`,
  ...page.screens.map((screen) => `  ${screen.id} "${screen.name}" ${Math.round(screen.width)}×${Math.round(screen.height)}`),
];

const viewLines = (view: AgentView): string[] => [
  `open page: ${view.pageId ?? "none"}`,
  `open screen: ${view.screenId ?? "none"}`,
  `selection: ${view.target ? addressText(view.target) : "none"}`,
];

export const registerDocument: RegisterTool = (server, deps, run) => {
  server.registerTool(
    "document",
    {
      title: "Document",
      description: "Pages and their screens (id, name, size), plus the page, screen and selection open in the app. Start here.",
      annotations: READ_ONLY,
    },
    () =>
      run("document", [], async () => {
        const doc = await deps.doc();
        return textResult([...doc.pages.flatMap(pageLines), ...viewLines(deps.view())].join("\n"));
      }),
  );
};
