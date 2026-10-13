import type { ScreenExport } from "../shared/export";

const MAX_TEXT_LENGTH = 64 * 1024 * 1024;

const MAX_IMAGES = 10_000;

const MAX_FAMILIES = 1000;

const MAX_NAME_LENGTH = 256;

const HASH = /^[0-9a-f]{1,128}$/;

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null;

const isText = (value: unknown): boolean => typeof value === "string" && value.length <= MAX_TEXT_LENGTH;

const isName = (value: unknown): boolean => typeof value === "string" && value.length > 0 && value.length <= MAX_NAME_LENGTH;

const isListOf = (value: unknown, max: number, item: (v: unknown) => boolean): boolean => Array.isArray(value) && value.length <= max && value.every(item);

const isImageHash = (value: unknown): value is string => typeof value === "string" && HASH.test(value);

export const isImageHashes = (value: unknown): value is string[] => isListOf(value, MAX_IMAGES, isImageHash);

const isStringList = (value: unknown): value is string[] => isListOf(value, MAX_IMAGES, (v) => typeof v === "string");

export const imageHashList = (value: unknown): string[] | undefined => (isStringList(value) ? [...new Set(value.filter(isImageHash))] : undefined);

export const isScreenExport = (value: unknown): value is ScreenExport =>
  isFields(value) && isName(value.screenId) && isText(value.html) && isText(value.css) && isImageHashes(value.images) && isListOf(value.families, MAX_FAMILIES, isName);
