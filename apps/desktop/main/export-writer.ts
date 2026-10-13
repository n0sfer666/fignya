import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ExportFile } from "./export-files";
import { writeAtomic } from "./write-atomic";

export const writeExport = async (dir: string, files: ExportFile[]): Promise<void> => {
  const paths = new Map(files.map((file) => [join(dir, file.path), file.data]));
  for (const folder of new Set([...paths.keys()].map((path) => dirname(path)))) await mkdir(folder, { recursive: true });
  await Promise.all([...paths].map(([path, data]) => writeAtomic(path, data)));
};
