import type { FamilyFace, FontDownload, FontFaces, FontRequest } from "../shared/fonts";
import { openFontStore, type FontStore } from "./font-store";
import { openUnavailableFonts, type UnavailableFonts } from "./font-unavailable";
import { downloadFamily, type FaceCheck, type Fetcher } from "./google-fonts";

type Stored = { result: FontDownload; faces?: FontFaces; checks: FaceCheck[] };

export type FontLibrary = {
  faces: () => Promise<FontFaces>;
  unavailable: () => Promise<FamilyFace[]>;
  download: (requests: FontRequest[]) => Promise<FontDownload[]>;
  read: (file: string) => Promise<Uint8Array | undefined>;
  onChange: (listener: (faces: FontFaces) => void) => void;
};

const storeFamily = async (fetcher: Fetcher, opened: FontStore, request: FontRequest): Promise<Stored> => {
  const { result, faces, checks } = await downloadFamily(fetcher, request);
  if (faces.length === 0) return { result, checks };
  try {
    return { result, faces: await opened.save(faces), checks };
  } catch (error) {
    console.error(`fignya: font ${request.family} save failed: ${String(error)}`);
    return { result: { family: request.family, status: "failed", missingFaces: request.faces.length }, checks };
  }
};

const remember = async (unavailable: Promise<UnavailableFonts>, checks: FaceCheck[]): Promise<void> => {
  try {
    await (await unavailable).record(checks);
  } catch (error) {
    console.error(`fignya: font availability save failed: ${String(error)}`);
  }
};

export const createFontLibrary = (dir: string, fetcher: Fetcher, now: () => number = Date.now): FontLibrary => {
  const store: Promise<FontStore> = openFontStore(dir);
  const unavailable: Promise<UnavailableFonts> = openUnavailableFonts(dir, now);
  const listeners: ((faces: FontFaces) => void)[] = [];
  let published: Promise<FontFaces> = store.then((opened) => opened.current());
  let queue: Promise<unknown> = Promise.resolve();

  const publish = (faces: FontFaces): void => {
    published = Promise.resolve(faces);
    for (const listener of listeners) listener(faces);
  };

  const downloadAll = async (requests: FontRequest[]): Promise<FontDownload[]> => {
    const opened = await store;
    const results: FontDownload[] = [];
    const checks: FaceCheck[] = [];
    let changed: FontFaces | undefined;
    for (const request of requests) {
      const stored = await storeFamily(fetcher, opened, request);
      changed = stored.faces ?? changed;
      results.push(stored.result);
      checks.push(...stored.checks);
    }
    if (changed) publish(changed);
    await remember(unavailable, checks);
    return results;
  };

  return {
    faces: () => published,
    unavailable: async () => (await unavailable).faces(),
    download: (requests) => {
      const next = queue.then(() => downloadAll(requests));
      queue = next.catch(() => undefined);
      return next;
    },
    read: async (file) => (await store).read(file),
    onChange: (listener) => {
      listeners.push(listener);
    },
  };
};
