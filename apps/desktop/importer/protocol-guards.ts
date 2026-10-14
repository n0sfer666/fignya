import type { EditChange } from "@fignya/model";
import type { ImporterEvent, ImporterRequest, Query, Restored } from "./protocol";

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null;

const isAssetType = (value: unknown): value is "screen" | "image" => value === "screen" || value === "image";

const isHistoryType = (value: unknown): value is "undo" | "redo" => value === "undo" || value === "redo";

const isQueryType = (value: unknown): value is Query["type"] => isAssetType(value) || isHistoryType(value) || value === "search" || value === "edit" || value === "save";

const isOptional = <T>(value: unknown, check: (v: unknown) => v is T): boolean => value === undefined || check(value);

const isFaceUse = (value: unknown): boolean => isFields(value) && typeof value.weight === "number" && typeof value.italic === "boolean";

const isFontUsage = (value: unknown): boolean =>
  isFields(value) && typeof value.family === "string" && typeof value.nodes === "number" && Array.isArray(value.faces) && value.faces.every(isFaceUse);

const isEditChange = (value: unknown): value is EditChange =>
  isFields(value) && typeof value.screenId === "string" && Array.isArray(value.target) && value.target.every((id) => typeof id === "string");

const isRestored = (value: unknown): value is Restored =>
  isFields(value) && typeof value.edits === "number" && typeof value.skipped === "number" && typeof value.stale === "boolean" && typeof value.key === "string";

const isBytes = (value: unknown): value is Uint8Array => value instanceof Uint8Array;

export const isImporterRequest = (value: unknown): value is ImporterRequest => {
  if (!isFields(value)) return false;
  if (value.type === "load") return typeof value.path === "string";
  if (typeof value.reqId !== "number") return false;
  if (value.type === "search") return typeof value.query === "string";
  if (value.type === "edit") return isFields(value.edit);
  if (isHistoryType(value.type) || value.type === "save") return true;
  return isAssetType(value.type) && typeof value.id === "string";
};

export const isImporterEvent = (value: unknown): value is ImporterEvent => {
  if (!isFields(value)) return false;
  switch (value.type) {
    case "progress":
      return isFields(value.progress) && typeof value.progress.done === "number" && typeof value.progress.total === "number";
    case "ready":
      return Array.isArray(value.pages) && isRestored(value.restored);
    case "failed":
      return typeof value.message === "string";
    case "fonts":
      return Array.isArray(value.fonts) && value.fonts.every(isFontUsage);
    case "screen":
      return typeof value.reqId === "number" && isOptional(value.model, isFields);
    case "image":
      return typeof value.reqId === "number" && isOptional(value.bytes, isBytes);
    case "found":
      return typeof value.reqId === "number" && Array.isArray(value.hits);
    case "edited":
      return typeof value.reqId === "number" && isOptional(value.change, isEditChange) && typeof value.dirty === "boolean";
    case "saved":
      return typeof value.reqId === "number" && typeof value.dirty === "boolean";
    case "refused":
      return isQueryType(value.request) && typeof value.reqId === "number" && typeof value.message === "string";
    default:
      return false;
  }
};
