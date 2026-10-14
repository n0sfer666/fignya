import { copyFile, readFile, stat } from "node:fs/promises";
import { writeAtomic } from "../main/write-atomic";

export type SidecarStore = {
  read: () => Promise<string | undefined>;
  write: (text: string) => Promise<void>;
  backup: () => Promise<void>;
};

const isMissing = (error: unknown): boolean => error instanceof Error && "code" in error && error.code === "ENOENT";

const unlessMissing = (error: unknown): undefined => {
  if (isMissing(error)) return undefined;
  throw error;
};

const MAX_SIDECAR_BYTES = 64 * 1024 * 1024;

const readSmall = async (path: string): Promise<string> => {
  if ((await stat(path)).size > MAX_SIDECAR_BYTES) throw new Error(`${path} is larger than ${MAX_SIDECAR_BYTES} bytes`);
  return readFile(path, "utf8");
};

export const sidecarPath = (figPath: string): string => `${figPath}.fignya`;

export const sidecarStore = (figPath: string): SidecarStore => {
  const path = sidecarPath(figPath);
  return {
    read: () => readSmall(path).catch(unlessMissing),
    write: (text) => writeAtomic(path, text),
    backup: () => copyFile(path, `${path}.bak`).catch(unlessMissing),
  };
};
