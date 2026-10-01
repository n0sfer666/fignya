import type { FontFaceUse, FontUsage } from "@fignya/fig-import";
import { MAX_FONT_FACES, MAX_FONT_REQUESTS } from "../../../shared/font-limits";
import type { FontDownload, FontRequest, StoredFace } from "../../../shared/fonts";

export type FontStatus = "missing" | FontDownload["status"];

export type FontRow = { family: string; nodes: number; status: FontStatus; faces: FontFaceUse[]; unavailableFaces: number };

const RETRIED: readonly FontStatus[] = ["missing", "failed"];

const faceId = (face: FontFaceUse): string => `${face.weight}:${face.italic}`;

const rowOf = (usage: FontUsage, stored: StoredFace[], installed: (family: string) => boolean, results: FontDownload[]): FontRow | undefined => {
  const cached = new Set(stored.filter((face) => face.family === usage.family).map(faceId));
  if (cached.size === 0 && installed(usage.family)) return undefined;
  const faces = usage.faces.filter((face) => !cached.has(faceId(face)));
  const result = results.find((r) => r.family === usage.family);
  if (!result && faces.length === 0) return undefined;
  return { family: usage.family, nodes: usage.nodes, status: result?.status ?? "missing", faces, unavailableFaces: result?.missingFaces ?? 0 };
};

export const fontReport = (usage: FontUsage[], stored: StoredFace[], installed: (family: string) => boolean, results: FontDownload[]): FontRow[] =>
  usage.flatMap((u) => rowOf(u, stored, installed, results) ?? []);

export const fontRequests = (rows: FontRow[]): FontRequest[] =>
  rows.filter((row) => RETRIED.includes(row.status) && row.faces.length > 0).map(({ family, faces }) => ({ family, faces: faces.slice(0, MAX_FONT_FACES) }));

export const requestBatches = (rows: FontRow[]): FontRequest[][] => {
  const requests = fontRequests(rows);
  return Array.from({ length: Math.ceil(requests.length / MAX_FONT_REQUESTS) }, (_, i) => requests.slice(i * MAX_FONT_REQUESTS, (i + 1) * MAX_FONT_REQUESTS));
};

export const mergeResults = (earlier: FontDownload[], latest: FontDownload[]): FontDownload[] => [
  ...earlier.filter((result) => !latest.some((r) => r.family === result.family)),
  ...latest,
];
