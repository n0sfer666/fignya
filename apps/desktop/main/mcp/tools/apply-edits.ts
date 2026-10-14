import * as z from "zod";
import { failure, jsonResult } from "../tool-result";
import { changedSummary } from "./changed";
import { editSchema, MAX_BATCH, parseEdits } from "./edit-input";
import { EDITS, type RegisterTool } from "./tool";

export const registerApplyEdits: RegisterTool = (server, deps, run) => {
  server.registerTool(
    "apply_edits",
    {
      title: "Apply edits",
      description: [
        "Apply a batch of edits as one undo step, all or nothing: the whole batch is validated first and any error",
        "returns { index, reason } with nothing applied. Edits inside a main component change every instance and are",
        "refused with the instance count until affectsInstances is true. The user saves the document; there is no save tool.",
      ].join(" "),
      inputSchema: {
        edits: z.array(editSchema).min(1).max(MAX_BATCH),
        affectsInstances: z.boolean().optional().describe("Allow edits inside main components that have instances."),
      },
      annotations: EDITS,
    },
    ({ edits, affectsInstances }) =>
      run(
        "apply_edits",
        edits.map((edit) => edit.target),
        async () => {
          await deps.doc();
          const parsed = parseEdits(edits);
          if (!Array.isArray(parsed)) return failure(JSON.stringify(parsed));
          const reply = await deps.editor.batch(parsed, affectsInstances === true);
          if ("index" in reply) return failure(JSON.stringify(reply));
          return jsonResult({ step: reply.top?.step ?? null, ...changedSummary(reply.changes) });
        },
      ),
  );
};
