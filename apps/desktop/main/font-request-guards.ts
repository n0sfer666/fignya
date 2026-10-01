import type { FontRequest } from "../shared/fonts";
import { MAX_FONT_FACES, MAX_FONT_REQUESTS } from "../shared/font-limits";

const MAX_FAMILY_LENGTH = 128;

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null;

const isFace = (value: unknown): boolean =>
  isFields(value) && typeof value.italic === "boolean" && typeof value.weight === "number" && Number.isInteger(value.weight) && value.weight >= 1 && value.weight <= 1000;

const isRequest = (value: unknown): value is FontRequest =>
  isFields(value) &&
  typeof value.family === "string" &&
  value.family.trim().length > 0 &&
  value.family.length <= MAX_FAMILY_LENGTH &&
  Array.isArray(value.faces) &&
  value.faces.length > 0 &&
  value.faces.length <= MAX_FONT_FACES &&
  value.faces.every(isFace);

export const isFontRequests = (value: unknown): value is FontRequest[] => Array.isArray(value) && value.length <= MAX_FONT_REQUESTS && value.every(isRequest);
