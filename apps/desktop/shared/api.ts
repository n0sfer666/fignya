import type { FontUsage, ImportProgress } from "@fignya/fig-import";
import type { Page, ScreenModel } from "@fignya/model";
import type { FontDownload, FontFaces, FontRequest } from "./fonts";

export type DocumentState = { status: "ready"; pages: Page[] } | { status: "error"; message: string };

export type ThumbJob = { id: number; model: ScreenModel; scale: number };

export type FignyaApi = {
  documentState: () => Promise<DocumentState>;
  onProgress: (handler: (progress: ImportProgress) => void) => () => void;
  onLost: (handler: (message: string) => void) => () => void;
  screen: (id: string) => Promise<ScreenModel | undefined>;
  onThumbJob: (handler: (job: ThumbJob) => void) => void;
  thumbRendered: (id: number) => void;
  showPage: (pageId: string) => void;
  documentFonts: () => Promise<FontUsage[]>;
  fontFaces: () => Promise<FontFaces>;
  onFontFaces: (handler: (faces: FontFaces) => void) => () => void;
  downloadFonts: (requests: FontRequest[]) => Promise<FontDownload[]>;
};

export const DOCUMENT_CHANNEL = "document:state";
export const PROGRESS_CHANNEL = "document:progress";
export const LOST_CHANNEL = "document:lost";
export const SCREEN_CHANNEL = "document:screen";
export const THUMB_JOB_CHANNEL = "thumb:job";
export const THUMB_DONE_CHANNEL = "thumb:done";
export const PAGE_CHANNEL = "thumb:page";
export const FONT_USAGE_CHANNEL = "fonts:usage";
export const FONT_FACES_CHANNEL = "fonts:faces";
export const FONT_CHANGED_CHANNEL = "fonts:changed";
export const FONT_DOWNLOAD_CHANNEL = "fonts:download";
