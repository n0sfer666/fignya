export const IMPORT_PHASES: readonly ["decode", "convert"] = ["decode", "convert"];

export type ImportProgress = { phase: (typeof IMPORT_PHASES)[number]; done: number; total: number };

export const PROGRESS_EVERY = 500;
