import { drain } from "./drain";
import { readArchive } from "./fig/read-archive";
import { importSteps, type FigImport } from "./import-steps";

export const importFig = (zipped: Uint8Array): FigImport => drain(importSteps(readArchive(zipped)));
