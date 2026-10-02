import type { ThumbFocus } from "../shared/api";
import { isTier } from "../shared/thumb-tiers";

const MAX_FOCUS_SCREENS = 10000;
const MAX_SCREEN_ID_LENGTH = 64;

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null;

const isScreenId = (value: unknown): boolean => typeof value === "string" && value.length > 0 && value.length <= MAX_SCREEN_ID_LENGTH;

export const isThumbFocus = (value: unknown): value is ThumbFocus =>
  isFields(value) &&
  typeof value.tier === "number" &&
  isTier(value.tier) &&
  Array.isArray(value.screenIds) &&
  value.screenIds.length <= MAX_FOCUS_SCREENS &&
  value.screenIds.every(isScreenId);
