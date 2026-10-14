import type { FontUsage, ImportProgress } from "@fignya/fig-import";
import type { Edit, EditChange, Page, ScreenModel, SearchHit } from "@fignya/model";

export type AssetQuery = { type: "screen" | "image"; reqId: number; id: string };

export type SearchQuery = { type: "search"; reqId: number; query: string };

export type EditQuery = { type: "edit"; reqId: number; edit: Edit } | { type: "undo"; reqId: number } | { type: "redo"; reqId: number };

export type SaveQuery = { type: "save"; reqId: number };

export type Query = AssetQuery | SearchQuery | EditQuery | SaveQuery;

export type Restored = { edits: number; skipped: number; stale: boolean; key: string };

export type ImporterRequest = { type: "load"; path: string } | Query;

export type ImporterEvent =
  | { type: "progress"; progress: ImportProgress }
  | { type: "ready"; pages: Page[]; restored: Restored }
  | { type: "failed"; message: string }
  | { type: "fonts"; fonts: FontUsage[] }
  | { type: "screen"; reqId: number; model: ScreenModel | undefined }
  | { type: "image"; reqId: number; bytes: Uint8Array | undefined }
  | { type: "found"; reqId: number; hits: SearchHit[] }
  | { type: "edited"; reqId: number; change: EditChange | undefined; dirty: boolean }
  | { type: "saved"; reqId: number; dirty: boolean }
  | { type: "refused"; request: Query["type"]; reqId: number; message: string };
