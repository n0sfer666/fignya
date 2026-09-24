import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const SIGNATURES: [string, number[]][] = [
  [".png", [0x89, 0x50, 0x4e, 0x47]],
  [".jpg", [0xff, 0xd8, 0xff]],
  [".gif", [0x47, 0x49, 0x46]],
  [".webp", [0x52, 0x49, 0x46, 0x46]],
];

const extension = (data: Uint8Array): string =>
  SIGNATURES.find(([, sig]) => sig.every((b, i) => data[i] === b))?.[0] ?? ".bin";

export type ImageStore = {
  url: (hash: string) => string;
  write: (dist: string) => Promise<number>;
};

export const imageStore = (images: Map<string, Uint8Array>): ImageStore => {
  const used = new Map<string, string>();
  const url = (hash: string): string => {
    const known = used.get(hash);
    if (known) return known;
    const data = images.get(hash);
    const path = `images/${hash}${data ? extension(data) : ".bin"}`;
    used.set(hash, path);
    return path;
  };
  const write = async (dist: string): Promise<number> => {
    await mkdir(join(dist, "images"), { recursive: true });
    let written = 0;
    for (const [hash, path] of used) {
      const data = images.get(hash);
      if (!data) continue;
      await Bun.write(join(dist, path), data);
      written += 1;
    }
    return written;
  };
  return { url, write };
};
