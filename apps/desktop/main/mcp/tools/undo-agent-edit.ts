import { jsonResult } from "../tool-result";
import { changedSummary } from "./changed";
import { EDITS, type RegisterTool } from "./tool";

export const registerUndoAgentEdit: RegisterTool = (server, deps, run) => {
  server.registerTool(
    "undo_agent_edit",
    {
      title: "Undo agent edit",
      description: "Undo the last apply_edits batch, only while it is on top of the history; a newer user edit blocks it.",
      annotations: EDITS,
    },
    () =>
      run("undo_agent_edit", [], async () => {
        await deps.doc();
        const edited = await deps.editor.undoAgent();
        return jsonResult(changedSummary(edited.changes));
      }),
  );
};
