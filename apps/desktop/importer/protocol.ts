import type { FontUsage, ImportProgress } from "@fignya/fig-import";
import type { Edit, EditChange, EditKey, HistoryTop, Inspection, NodeId, Page, ScreenModel, SearchHit } from "@fignya/model";

export type AssetQuery = { type: "screen" | "image"; reqId: number; id: string };

export type SearchQuery = { type: "search"; reqId: number; query: string; names?: boolean };

export type EditQuery =
  | { type: "edit"; reqId: number; edit: Edit }
  | { type: "batch"; reqId: number; edits: Edit[]; origin: "agent"; affectsInstances: boolean }
  | { type: "undo"; reqId: number; origin?: "agent" }
  | { type: "redo"; reqId: number };

export type ReadQuery = { type: "outline"; reqId: number; address: NodeId[]; limit: number } | { type: "inspect"; reqId: number; address: NodeId[] };

export type SaveQuery = { type: "save"; reqId: number };

export type Query = AssetQuery | SearchQuery | EditQuery | ReadQuery | SaveQuery;

export type Restored = { edits: number; skipped: number; stale: boolean; key: string };

export type NodeDetails = { hit: SearchHit; inspection: Inspection; values: Partial<Record<EditKey, string>> };

export type ImporterRequest = { type: "load"; path: string } | Query;

export type ImporterEvent =
  | { type: "progress"; progress: ImportProgress }
  | { type: "ready"; pages: Page[]; restored: Restored }
  | { type: "failed"; message: string }
  | { type: "fonts"; fonts: FontUsage[] }
  | { type: "screen"; reqId: number; model: ScreenModel | undefined }
  | { type: "image"; reqId: number; bytes: Uint8Array | undefined }
  | { type: "found"; reqId: number; hits: SearchHit[] }
  | { type: "edited"; reqId: number; changes: EditChange[]; top?: HistoryTop; dirty: boolean }
  | { type: "rejected"; reqId: number; index: number; reason: string }
  | { type: "outlined"; reqId: number; text: string | undefined }
  | { type: "inspected"; reqId: number; details: NodeDetails | undefined }
  | { type: "saved"; reqId: number; dirty: boolean }
  | { type: "refused"; request: Query["type"]; reqId: number; message: string };
