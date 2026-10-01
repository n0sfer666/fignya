import type { FontUsage, ImportProgress } from "@fignya/fig-import";
import type { Page, ScreenModel } from "@fignya/model";

export type AssetQuery = { type: "screen" | "image"; reqId: number; id: string };

export type ImporterRequest = { type: "load"; path: string } | AssetQuery;

export type ImporterEvent =
  | { type: "progress"; progress: ImportProgress }
  | { type: "ready"; pages: Page[] }
  | { type: "failed"; message: string }
  | { type: "fonts"; fonts: FontUsage[] }
  | { type: "screen"; reqId: number; model: ScreenModel | undefined }
  | { type: "image"; reqId: number; bytes: Uint8Array | undefined }
  | { type: "refused"; request: AssetQuery["type"]; reqId: number; message: string };
