import { MAX_CHAIN_LENGTH, MAX_ID_LENGTH } from "./address-limits";
import { isEditKey, type Edit, type StylePatch } from "./edit";
import type { NodeId } from "./node";
import { STYLE_INPUTS } from "./style-input";
import { isStylePatch } from "./style-patch-guard";

export type AgentEditInput = { target: string; style?: Readonly<Record<string, string>>; text?: string; hidden?: boolean };

export type Rejection = { reason: string };

export const parseAddress = (address: string): NodeId[] | undefined => {
  const ids = address.split("/").map((id) => id.trim());
  return ids.length <= MAX_CHAIN_LENGTH && ids.every((id) => id.length > 0 && id.length <= MAX_ID_LENGTH) ? ids : undefined;
};

const stylePatch = (style: Readonly<Record<string, string>>): StylePatch | Rejection => {
  let patch: StylePatch = {};
  for (const [key, input] of Object.entries(style)) {
    if (!isEditKey(key)) return { reason: `"${key}" is not an editable style key` };
    const parsed = STYLE_INPUTS[key](input);
    if (!isStylePatch(parsed)) return { reason: `invalid value for "${key}"` };
    patch = { ...patch, ...parsed };
  }
  return patch;
};

const isRejection = (value: object): value is Rejection => "reason" in value;

export const parseAgentEdit = (input: AgentEditInput): Edit | Rejection => {
  const target = parseAddress(input.target);
  if (!target) return { reason: "invalid address" };
  if (input.hidden !== undefined) return { reason: '"hidden" is not editable yet' };
  const style = input.style && Object.keys(input.style).length > 0 ? stylePatch(input.style) : undefined;
  if (style && isRejection(style)) return style;
  if (!style && input.text === undefined) return { reason: "nothing to edit" };
  return { target, ...(style ? { style } : {}), ...(input.text === undefined ? {} : { text: input.text }) };
};

export const isAgentRejection = (value: Edit | Rejection): value is Rejection => isRejection(value);
