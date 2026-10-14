import type { BrowserWindow } from "electron";
import { basename } from "node:path";
import { sidecarPath } from "../importer/sidecar-store";
import { showRestoreWarning } from "./document-dialogs";
import type { LoadedDocument } from "./load-document";
import { restoreWarning } from "./restore-warning";

export const reportRestored = (window: BrowserWindow, { path, restored }: Pick<LoadedDocument, "path" | "restored">): void => {
  if (restored.edits > 0) console.log(`fignya: restored ${restored.edits} saved edits`);
  const warning = restoreWarning(restored, basename(sidecarPath(path)));
  if (!warning) return;
  console.warn(`fignya: ${warning}`);
  showRestoreWarning(window, warning);
};
