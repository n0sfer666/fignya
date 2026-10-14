import type { EditChange } from "@fignya/model";
import { addressText } from "./address";

export type ChangedSummary = { changed: string[]; screens: string[] };

export const changedSummary = (changes: readonly EditChange[]): ChangedSummary => ({
  changed: [...new Set(changes.map((change) => addressText(change.target)))],
  screens: [...new Set(changes.map((change) => change.screenId))],
});
