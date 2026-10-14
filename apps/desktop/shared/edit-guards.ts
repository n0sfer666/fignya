import { isStylePatch, MAX_CHAIN_LENGTH, MAX_ID_LENGTH, type Edit } from "@fignya/model";

const MAX_TEXT_LENGTH = 100_000;

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null;

export const isId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH;

export const isTarget = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.length <= MAX_CHAIN_LENGTH && value.every(isId);

const isText = (value: unknown): boolean => typeof value === "string" && value.length <= MAX_TEXT_LENGTH;

const hasChange = ({ style, text }: Fields): boolean =>
  (style !== undefined || text !== undefined) && (style === undefined || isStylePatch(style)) && (text === undefined || isText(text));

export const isEdit = (value: unknown): value is Edit => isFields(value) && isTarget(value.target) && hasChange(value);

export const pickEdit = ({ target, style, text }: Edit): Edit => ({ target, ...(style === undefined ? {} : { style }), ...(text === undefined ? {} : { text }) });
