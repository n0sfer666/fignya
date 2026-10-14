import { MAX_ID_LENGTH } from "@fignya/model";
import * as z from "zod";
import { textResult } from "../tool-result";
import { UI_ONLY, type RegisterTool } from "./tool";

export const registerOpenScreen: RegisterTool = (server, deps, run) => {
  server.registerTool(
    "open_screen",
    {
      title: "Open screen",
      description: "Show a screen on the canvas of the app, so the user sees what the agent works on.",
      inputSchema: { screenId: z.string().min(1).max(MAX_ID_LENGTH) },
      annotations: UI_ONLY,
    },
    ({ screenId }) =>
      run("open_screen", [screenId], async () => {
        const doc = await deps.doc();
        const page = doc.pages.find((candidate) => candidate.screens.some((screen) => screen.id === screenId));
        if (!page) throw new Error("no screen with this id");
        deps.focus({ place: { pageId: page.id, screenId } });
        return textResult("opened");
      }),
  );
};
