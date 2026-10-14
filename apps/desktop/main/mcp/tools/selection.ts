import { jsonResult } from "../tool-result";
import { addressText } from "./address";
import { READ_ONLY, type RegisterTool } from "./tool";

export const registerSelection: RegisterTool = (server, deps, run) => {
  server.registerTool(
    "selection",
    { title: "Selection", description: "The page, screen and selected layer address currently open in the app.", annotations: READ_ONLY },
    () =>
      run("selection", [], async () => {
        const { pageId, screenId, target } = deps.view();
        return jsonResult({ page: pageId ?? null, screen: screenId ?? null, selection: target ? addressText(target) : null });
      }),
  );
};
