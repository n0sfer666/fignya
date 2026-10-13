import { bool, type Rec } from "./guards";

const CLIPPING = new Set(["FRAME", "INSTANCE", "SYMBOL"]);

export const clipsContent = (raw: Rec, type: string): boolean => CLIPPING.has(type) && bool(raw, "frameMaskDisabled") !== true;
