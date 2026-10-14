import { OUTLINE_LIMIT, OUTLINE_MAX } from "@fignya/model";
import * as z from "zod";
import { textResult } from "../tool-result";
import { addressSchema, requireAddress } from "./address";
import { READ_ONLY, type RegisterTool } from "./tool";

export const registerOutline: RegisterTool = (server, deps, run) => {
  server.registerTool(
    "outline",
    {
      title: "Outline",
      description: [
        "Layer outline of a screen or subtree: one line per node with address, name, kind, box (x,y w×h) and text.",
        "Instances are collapsed to their component and texts; call outline with an instance address to expand it.",
        "Hidden layers are skipped. Long outlines end with a remainder count; outline a deeper address to see more.",
      ].join(" "),
      inputSchema: {
        address: addressSchema.describe("Screen id or node address to outline."),
        limit: z.number().int().min(1).max(OUTLINE_MAX).optional().describe(`Max nodes in the answer, default ${OUTLINE_LIMIT}.`),
      },
      annotations: READ_ONLY,
    },
    ({ address, limit }) =>
      run("outline", [address], async () => {
        const doc = await deps.doc();
        const text = await doc.outline(requireAddress(address), limit ?? OUTLINE_LIMIT);
        if (text === undefined) throw new Error("no node at this address");
        return textResult(text);
      }),
  );
};
