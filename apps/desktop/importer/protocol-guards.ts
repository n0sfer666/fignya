import { OUTLINE_MAX, type EditChange, type HistoryTop } from "@fignya/model";
import { isEdit, isTarget } from "../shared/edit-guards";
import type { ImporterEvent, ImporterRequest, Query, Restored } from "./protocol";

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null;

const isAssetType = (value: unknown): value is "screen" | "image" => value === "screen" || value === "image";

const MAX_BATCH_EDITS = 1000;

const QUERY_TYPES: readonly Query["type"][] = ["screen", "image", "search", "edit", "batch", "undo", "redo", "outline", "inspect", "save"];

const isQueryType = (value: unknown): value is Query["type"] => QUERY_TYPES.some((type) => type === value);

const isOptional = <T>(value: unknown, check: (v: unknown) => v is T): boolean => value === undefined || check(value);

const isFaceUse = (value: unknown): boolean => isFields(value) && typeof value.weight === "number" && typeof value.italic === "boolean";

const isFontUsage = (value: unknown): boolean =>
  isFields(value) && typeof value.family === "string" && typeof value.nodes === "number" && Array.isArray(value.faces) && value.faces.every(isFaceUse);

const isEditChange = (value: unknown): value is EditChange =>
  isFields(value) && typeof value.screenId === "string" && Array.isArray(value.target) && value.target.every((id) => typeof id === "string");

const isHistoryTop = (value: unknown): value is HistoryTop =>
  isFields(value) && typeof value.step === "number" && (value.origin === "user" || value.origin === "agent");

const isOutlineLimit = (value: unknown): boolean => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= OUTLINE_MAX;

const isRestored = (value: unknown): value is Restored =>
  isFields(value) && typeof value.edits === "number" && typeof value.skipped === "number" && typeof value.stale === "boolean" && typeof value.key === "string";

const isBytes = (value: unknown): value is Uint8Array => value instanceof Uint8Array;

export const isImporterRequest = (value: unknown): value is ImporterRequest => {
  if (!isFields(value)) return false;
  if (value.type === "load") return typeof value.path === "string";
  if (typeof value.reqId !== "number") return false;
  if (value.type === "search") return typeof value.query === "string" && isOptional(value.names, (v): v is boolean => typeof v === "boolean");
  if (value.type === "edit") return isFields(value.edit);
  if (value.type === "batch") return Array.isArray(value.edits) && value.edits.length >= 1 && value.edits.length <= MAX_BATCH_EDITS && value.edits.every(isEdit) && value.origin === "agent" && typeof value.affectsInstances === "boolean";
  if (value.type === "undo") return value.origin === undefined || value.origin === "agent";
  if (value.type === "outline") return isTarget(value.address) && isOutlineLimit(value.limit);
  if (value.type === "inspect") return isTarget(value.address);
  if (value.type === "redo" || value.type === "save") return true;
  return isAssetType(value.type) && typeof value.id === "string";
};

export const refusalOf = (value: unknown): ImporterEvent | undefined =>
  isFields(value) && typeof value.reqId === "number" && isQueryType(value.type)
    ? { type: "refused", request: value.type, reqId: value.reqId, message: "invalid request" }
    : undefined;

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
      return typeof value.reqId === "number" && Array.isArray(value.changes) && value.changes.every(isEditChange) && isOptional(value.top, isHistoryTop) && typeof value.dirty === "boolean";
    case "rejected":
      return typeof value.reqId === "number" && typeof value.index === "number" && typeof value.reason === "string";
    case "outlined":
      return typeof value.reqId === "number" && isOptional(value.text, (v): v is string => typeof v === "string");
    case "inspected":
      return typeof value.reqId === "number" && isOptional(value.details, isFields);
    case "saved":
      return typeof value.reqId === "number" && typeof value.dirty === "boolean";
    case "refused":
      return isQueryType(value.request) && typeof value.reqId === "number" && typeof value.message === "string";
    default:
      return false;
  }
};
