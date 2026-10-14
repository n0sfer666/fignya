import type { Edit } from "@fignya/model";
import { isEdit, pickEdit } from "../shared/edit-guards";

export type BaseFingerprint = { size: number; sha256: string };

export type Sidecar = { base: BaseFingerprint; edits: Edit[] };

const FORMAT = "fignya-edits";

const VERSION = 1;

const SHA256 = /^[0-9a-f]{64}$/;

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null && !Array.isArray(value);

const isBase = (value: unknown): value is BaseFingerprint =>
  isFields(value) && Number.isSafeInteger(value.size) && typeof value.sha256 === "string" && SHA256.test(value.sha256);

const isEdits = (value: unknown): value is Edit[] => Array.isArray(value) && value.every(isEdit);

const parsed = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export const parseSidecar = (text: string): Sidecar | undefined => {
  const value = parsed(text);
  if (!isFields(value) || value.format !== FORMAT || value.version !== VERSION) return undefined;
  const { base, edits } = value;
  return isBase(base) && isEdits(edits) ? { base, edits: edits.map(pickEdit) } : undefined;
};

export const serializeSidecar = ({ base, edits }: Sidecar): string => `${JSON.stringify({ format: FORMAT, version: VERSION, base, edits }, null, 2)}\n`;

export const sameBase = (a: BaseFingerprint, b: BaseFingerprint): boolean => a.size === b.size && a.sha256 === b.sha256;
