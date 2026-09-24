import { IMPORT_PHASES, type ImportProgress } from "@fignya/fig-import";

export const progressPercent = ({ phase, done, total }: ImportProgress): number =>
  Math.floor(((IMPORT_PHASES.indexOf(phase) + (total > 0 ? Math.min(done / total, 1) : 1)) / IMPORT_PHASES.length) * 100);
