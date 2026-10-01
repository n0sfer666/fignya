import type { FontDownload, FontFaces, FontRequest } from "../shared/fonts";
import { openFontStore, type FontStore } from "./font-store";
import { downloadFamily, type Fetcher } from "./google-fonts";

type Stored = { result: FontDownload; faces?: FontFaces };

export type FontLibrary = {
  faces: () => Promise<FontFaces>;
  download: (requests: FontRequest[]) => Promise<FontDownload[]>;
  read: (file: string) => Promise<Uint8Array | undefined>;
  onChange: (listener: (faces: FontFaces) => void) => void;
};

const storeFamily = async (fetcher: Fetcher, opened: FontStore, request: FontRequest): Promise<Stored> => {
  const { result, faces } = await downloadFamily(fetcher, request);
  if (faces.length === 0) return { result };
  try {
    return { result, faces: await opened.save(faces) };
  } catch (error) {
    console.error(`fignya: font ${request.family} save failed: ${String(error)}`);
    return { result: { family: request.family, status: "failed", missingFaces: request.faces.length } };
  }
};

export const createFontLibrary = (dir: string, fetcher: Fetcher): FontLibrary => {
  const store: Promise<FontStore> = openFontStore(dir);
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
    let changed: FontFaces | undefined;
    for (const request of requests) {
      const { result, faces } = await storeFamily(fetcher, opened, request);
      changed = faces ?? changed;
      results.push(result);
    }
    if (changed) publish(changed);
    return results;
  };

  return {
    faces: () => published,
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
