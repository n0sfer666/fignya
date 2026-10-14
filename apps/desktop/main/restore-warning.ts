import type { Restored } from "../importer/protocol";

export const restoreWarning = ({ edits, skipped, stale }: Restored, file: string): string | undefined => {
  const backup = `Saving will move it to ${file}.bak.`;
  if (stale) return `${file} was saved for a different version of this file or can't be read, so its changes were not applied. ${backup}`;
  if (skipped > 0) return `${skipped} of ${edits + skipped} saved changes in ${file} no longer match this file and were not applied. ${backup}`;
  return undefined;
};
