import { EDIT_KEYS, isAgentRejection, parseAgentEdit, type BatchRejection, type Edit } from "@fignya/model";
import * as z from "zod";
import { addressSchema } from "./address";

export const MAX_BATCH = 200;

const styleShape = Object.fromEntries(EDIT_KEYS.map((key) => [key, z.string().max(1024).optional()]));

export const editSchema = z.object({
  target: addressSchema,
  style: z
    .object(styleShape)
    .catchall(z.string())
    .optional()
    .describe('CSS values as typed in the inspector: "#ff6600", "8px 16px", "16px", "Inter", "center". Only the listed keys are editable.'),
  text: z.string().max(100_000).optional().describe("New characters of a text layer."),
  hidden: z.boolean().optional().describe("Layer visibility. Not editable yet."),
});

export type EditInput = z.infer<typeof editSchema>;

const definedStyle = (style: Readonly<Record<string, string | undefined>>): Record<string, string> =>
  Object.fromEntries(Object.entries(style).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]])));

export const parseEdits = (inputs: readonly EditInput[]): Edit[] | BatchRejection => {
  const edits: Edit[] = [];
  for (const [index, { style, ...rest }] of inputs.entries()) {
    const parsed = parseAgentEdit({ ...rest, ...(style ? { style: definedStyle(style) } : {}) });
    if (isAgentRejection(parsed)) return { index, reason: parsed.reason };
    edits.push(parsed);
  }
  return edits;
};
