import { createHash } from "node:crypto";
import type { FontFaces, StoredFace } from "../shared/fonts";
import { UNICODE_RANGE } from "./font-css";

export const FONT_FILE = /^[0-9a-f]{16}\.(woff2|woff|ttf|otf)$/;

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null;

const isStoredFace = (value: unknown): value is StoredFace =>
  isFields(value) &&
  typeof value.family === "string" &&
  typeof value.weight === "number" &&
  Number.isInteger(value.weight) &&
  typeof value.italic === "boolean" &&
  (value.unicodeRange === undefined || (typeof value.unicodeRange === "string" && UNICODE_RANGE.test(value.unicodeRange))) &&
  typeof value.file === "string" &&
  FONT_FILE.test(value.file);

export const faceKey = (face: StoredFace): string => `${face.family}\n${face.weight}\n${face.italic}`;

export const fontFaces = (faces: StoredFace[]): FontFaces => {
  const lines = faces.map((face) => `${faceKey(face)}\n${face.unicodeRange ?? ""}\n${face.file}`).sort();
  return { version: faces.length ? createHash("sha1").update(lines.join("\n\n")).digest("hex").slice(0, 16) : "", faces };
};

export const parseManifest = (text: string): StoredFace[] => {
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value) ? value.filter(isStoredFace) : [];
  } catch {
    return [];
  }
};
