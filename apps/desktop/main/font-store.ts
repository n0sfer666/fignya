import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FontFaces, StoredFace } from "../shared/fonts";
import { faceKey, FONT_FILE, fontFaces, parseManifest } from "./font-manifest";
import type { FetchedFace } from "./google-fonts";
import { writeAtomic } from "./write-atomic";

export type FontStore = {
  current: () => FontFaces;
  save: (fetched: FetchedFace[]) => Promise<FontFaces>;
  read: (file: string) => Promise<Uint8Array | undefined>;
};

const MANIFEST = "faces.json";

const EXTENSIONS: Record<string, string> = { woff2: "woff2", woff: "woff", truetype: "ttf", opentype: "otf" };

const fileOf = (face: FetchedFace): string | undefined => {
  const extension = EXTENSIONS[face.format];
  return extension && `${createHash("sha1").update(face.url).digest("hex").slice(0, 16)}.${extension}`;
};

const stored = (face: FetchedFace, file: string): StoredFace => ({
  family: face.family,
  weight: face.weight,
  italic: face.italic,
  ...(face.unicodeRange ? { unicodeRange: face.unicodeRange } : {}),
  file,
});

export const openFontStore = async (dir: string): Promise<FontStore> => {
  const manifest = join(dir, MANIFEST);
  let state = fontFaces(parseManifest(await readFile(manifest, "utf8").catch(() => "")));
  return {
    current: () => state,
    save: async (fetched) => {
      await mkdir(dir, { recursive: true });
      const added = await Promise.all(
        fetched.map(async (face): Promise<StoredFace[]> => {
          const file = fileOf(face);
          if (!file) return [];
          await writeAtomic(join(dir, file), face.bytes);
          return [stored(face, file)];
        }),
      );
      const faces = added.flat();
      const replaced = new Set(faces.map(faceKey));
      const next = [...state.faces.filter((face) => !replaced.has(faceKey(face))), ...faces];
      await writeAtomic(manifest, JSON.stringify(next));
      state = fontFaces(next);
      return state;
    },
    read: async (file) => (FONT_FILE.test(file) ? readFile(join(dir, file)).catch(() => undefined) : undefined),
  };
};
