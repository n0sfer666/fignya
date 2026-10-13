import { rename, rm, writeFile } from "node:fs/promises";

export const writeAtomic = async (path: string, data: Uint8Array | string): Promise<void> => {
  const temp = `${path}.${process.pid}.tmp`;
  try {
    await writeFile(temp, data);
    await rename(temp, path);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
};
