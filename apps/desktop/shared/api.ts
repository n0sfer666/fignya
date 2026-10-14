import type { FontUsage, ImportProgress } from "@fignya/fig-import";
import type { Box, Edit, EditOrigin, NodeId, Page, ScreenModel, SearchHit, SearchPlace } from "@fignya/model";
import type { ExportResult, ImageFiles, ScreenExport } from "./export";
import type { FamilyFace, FontDownload, FontFaces, FontRequest } from "./fonts";

export type DocumentState = { status: "ready"; pages: Page[] } | { status: "error"; message: string };

export type ThumbJob = { id: number; model: ScreenModel; scale: number; origin: Pick<Box, "x" | "y">; measure?: NodeId[] };

export type ThumbFocus = { tier: number; screenIds: string[] };

export type CanvasZoom = "in" | "out" | "actual";

export type DocumentChanged = { screenId: NodeId; targets: NodeId[][]; revision: number; origin: EditOrigin };

export type AgentView = { pageId?: string; screenId?: NodeId; target?: NodeId[] };

export type AgentFocus = { place: SearchPlace; target?: NodeId[] };

export type HistoryStep = "undo" | "redo";

export type FignyaApi = {
  documentState: () => Promise<DocumentState>;
  onProgress: (handler: (progress: ImportProgress) => void) => () => void;
  onLost: (handler: (message: string) => void) => () => void;
  screen: (id: string) => Promise<ScreenModel | undefined>;
  search: (query: string) => Promise<SearchHit[]>;
  onThumbJob: (handler: (job: ThumbJob) => void) => void;
  thumbRendered: (id: number, box?: Box) => void;
  showPage: (pageId: string) => void;
  focusScreens: (focus: ThumbFocus) => void;
  documentFonts: () => Promise<FontUsage[]>;
  fontFaces: () => Promise<FontFaces>;
  onFontFaces: (handler: (faces: FontFaces) => void) => () => void;
  downloadFonts: (requests: FontRequest[]) => Promise<FontDownload[]>;
  unavailableFonts: () => Promise<FamilyFace[]>;
  onCanvasZoom: (handler: (zoom: CanvasZoom) => void) => () => void;
  edit: (edit: Edit) => Promise<void>;
  onChanged: (handler: (change: DocumentChanged) => void) => () => void;
  step: (step: HistoryStep) => void;
  exportAvailable: (screenId: string | undefined) => void;
  onExportRequest: (handler: () => void) => () => void;
  exportImages: (hashes: string[]) => Promise<ImageFiles>;
  exportScreen: (bundle: ScreenExport) => Promise<ExportResult>;
  exportFailed: (message: string) => void;
  playAvailable: (screenId: string | undefined) => void;
  onPlayRequest: (handler: () => void) => () => void;
  reportView: (view: AgentView) => void;
  onAgentFocus: (handler: (focus: AgentFocus) => void) => () => void;
  onAgentStatus: (handler: (connected: boolean) => void) => () => void;
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
export const EDIT_CHANNEL = "document:edit";
export const CHANGED_CHANNEL = "document:changed";
export const HISTORY_CHANNEL = "document:history";
export const EXPORT_AVAILABLE_CHANNEL = "export:available";
export const EXPORT_REQUEST_CHANNEL = "export:request";
export const EXPORT_IMAGES_CHANNEL = "export:images";
export const EXPORT_CHANNEL = "export:screen";
export const EXPORT_FAILED_CHANNEL = "export:failed";
export const PLAY_AVAILABLE_CHANNEL = "play:available";
export const PLAY_REQUEST_CHANNEL = "play:request";
export const VIEW_CHANNEL = "agent:view";
export const AGENT_FOCUS_CHANNEL = "agent:focus";
export const AGENT_STATUS_CHANNEL = "agent:status";
