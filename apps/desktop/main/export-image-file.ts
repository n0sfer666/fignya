import { imageMime } from "@fignya/fig-import";

const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };

export const imageFile = (hash: string, data: Uint8Array): string => `${hash}.${EXTENSIONS[imageMime(data)] ?? "bin"}`;
