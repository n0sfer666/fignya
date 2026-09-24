import type { ImporterEvent, ImporterRequest } from "./protocol";

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null;

const isQueryType = (value: unknown): value is "screen" | "image" => value === "screen" || value === "image";

const isOptional = <T>(value: unknown, check: (v: unknown) => v is T): boolean => value === undefined || check(value);

const isBytes = (value: unknown): value is Uint8Array => value instanceof Uint8Array;

export const isImporterRequest = (value: unknown): value is ImporterRequest => {
  if (!isFields(value)) return false;
  if (value.type === "load") return typeof value.path === "string";
  return isQueryType(value.type) && typeof value.reqId === "number" && typeof value.id === "string";
};

export const isImporterEvent = (value: unknown): value is ImporterEvent => {
  if (!isFields(value)) return false;
  switch (value.type) {
    case "progress":
      return isFields(value.progress) && typeof value.progress.done === "number" && typeof value.progress.total === "number";
    case "ready":
      return Array.isArray(value.pages);
    case "failed":
      return typeof value.message === "string";
    case "screen":
      return typeof value.reqId === "number" && isOptional(value.model, isFields);
    case "image":
      return typeof value.reqId === "number" && isOptional(value.bytes, isBytes);
    case "refused":
      return isQueryType(value.request) && typeof value.reqId === "number" && typeof value.message === "string";
    default:
      return false;
  }
};
