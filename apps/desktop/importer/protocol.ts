import type { FontUsage, ImportProgress } from "@fignya/fig-import";
import type { Page, ScreenModel, SearchHit } from "@fignya/model";

export type AssetQuery = { type: "screen" | "image"; reqId: number; id: string };

export type SearchQuery = { type: "search"; reqId: number; query: string };

export type Query = AssetQuery | SearchQuery;

export type ImporterRequest = { type: "load"; path: string } | Query;

export type ImporterEvent =
  | { type: "progress"; progress: ImportProgress }
  | { type: "ready"; pages: Page[] }
  | { type: "failed"; message: string }
  | { type: "fonts"; fonts: FontUsage[] }
  | { type: "screen"; reqId: number; model: ScreenModel | undefined }
  | { type: "image"; reqId: number; bytes: Uint8Array | undefined }
  | { type: "found"; reqId: number; hits: SearchHit[] }
  | { type: "refused"; request: Query["type"]; reqId: number; message: string };
