import type { FontUsage, ImportProgress } from "@fignya/fig-import";
import type { Page, ScreenModel, SearchHit } from "@fignya/model";
import type { FamilyFace, FontDownload, FontFaces, FontRequest } from "./fonts";

export type DocumentState = { status: "ready"; pages: Page[] } | { status: "error"; message: string };

export type ThumbJob = { id: number; model: ScreenModel; scale: number };

export type ThumbFocus = { tier: number; screenIds: string[] };

export type CanvasZoom = "in" | "out" | "actual";

export type FignyaApi = {
  documentState: () => Promise<DocumentState>;
  onProgress: (handler: (progress: ImportProgress) => void) => () => void;
  onLost: (handler: (message: string) => void) => () => void;
  screen: (id: string) => Promise<ScreenModel | undefined>;
  search: (query: string) => Promise<SearchHit[]>;
  onThumbJob: (handler: (job: ThumbJob) => void) => void;
  thumbRendered: (id: number) => void;
  showPage: (pageId: string) => void;
  focusScreens: (focus: ThumbFocus) => void;
  documentFonts: () => Promise<FontUsage[]>;
  fontFaces: () => Promise<FontFaces>;
  onFontFaces: (handler: (faces: FontFaces) => void) => () => void;
  downloadFonts: (requests: FontRequest[]) => Promise<FontDownload[]>;
  unavailableFonts: () => Promise<FamilyFace[]>;
  onCanvasZoom: (handler: (zoom: CanvasZoom) => void) => () => void;
};

export const DOCUMENT_CHANNEL = "document:state";
export const PROGRESS_CHANNEL = "document:progress";
export const LOST_CHANNEL = "document:lost";
export const SCREEN_CHANNEL = "document:screen";
export const SEARCH_CHANNEL = "document:search";
export const THUMB_JOB_CHANNEL = "thumb:job";
export const THUMB_DONE_CHANNEL = "thumb:done";
export const PAGE_CHANNEL = "thumb:page";
export const FOCUS_CHANNEL = "thumb:focus";
export const FONT_USAGE_CHANNEL = "fonts:usage";
export const FONT_FACES_CHANNEL = "fonts:faces";
export const FONT_CHANGED_CHANNEL = "fonts:changed";
export const FONT_DOWNLOAD_CHANNEL = "fonts:download";
export const FONT_UNAVAILABLE_CHANNEL = "fonts:unavailable";
export const CANVAS_ZOOM_CHANNEL = "canvas:zoom";
