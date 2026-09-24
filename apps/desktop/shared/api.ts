import type { Page, ScreenModel } from "@fignya/model";

export type DocumentState = { status: "ready"; pages: Page[] } | { status: "error"; message: string };

export type ThumbJob = { id: number; model: ScreenModel; scale: number };

export type FignyaApi = {
  documentState: () => Promise<DocumentState>;
  screen: (id: string) => Promise<ScreenModel | undefined>;
  onThumbJob: (handler: (job: ThumbJob) => void) => void;
  thumbRendered: (id: number) => void;
};

export const DOCUMENT_CHANNEL = "document:state";
export const SCREEN_CHANNEL = "document:screen";
export const THUMB_JOB_CHANNEL = "thumb:job";
export const THUMB_DONE_CHANNEL = "thumb:done";
