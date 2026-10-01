import type { FontFaceUse } from "@fignya/fig-import";

export type StoredFace = FontFaceUse & { family: string; unicodeRange?: string; file: string };

export type FontFaces = { version: string; faces: StoredFace[] };

export type FontRequest = { family: string; faces: FontFaceUse[] };

export type FontDownload = { family: string; status: "downloaded" | "unavailable" | "failed"; missingFaces: number };
