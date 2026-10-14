export type ScreenExport = { screenId: string; html: string; css: string; images: string[]; families: string[] };

export type ExportResult = "saved" | "canceled" | "failed";

export type ImageFiles = Record<string, string>;

export const exportImagePath = (file: string): string => `images/${file}`;
