import { isStylePatch, type Edit } from "@fignya/model";

const MAX_TARGET_LENGTH = 64;

const MAX_ID_LENGTH = 64;

const MAX_TEXT_LENGTH = 100_000;

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null;

const isId = (value: unknown): boolean => typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH;

const isTarget = (value: unknown): boolean => Array.isArray(value) && value.length > 0 && value.length <= MAX_TARGET_LENGTH && value.every(isId);

const isText = (value: unknown): boolean => typeof value === "string" && value.length <= MAX_TEXT_LENGTH;

const hasChange = ({ style, text }: Fields): boolean =>
  (style !== undefined || text !== undefined) && (style === undefined || isStylePatch(style)) && (text === undefined || isText(text));

export const isEdit = (value: unknown): value is Edit => isFields(value) && isTarget(value.target) && hasChange(value);
