import type { Page, Screen } from "@fignya/model";
import type { LoadedDocument } from "./load-document";
import { serialQueue } from "./serial-queue";
import { createThumbRenderer, type ThumbRenderer } from "./thumb-renderer";
import { thumbScale } from "./thumb-scale";
import { createThumbStore, type ThumbStore } from "./thumb-store";

export type Thumbnails = (screenId: string) => Promise<Uint8Array | undefined>;

const logError = (what: string) => (error: unknown): void => console.error(`fignya: ${what}: ${String(error)}`);

const findScreen = (pages: Page[], id: string): Screen | undefined =>
  pages.flatMap((p) => p.screens).find((s) => s.id === id);

export const createThumbnails = (loaded: Promise<LoadedDocument>, root: string): Thumbnails => {
  const inflight = new Map<string, Promise<Uint8Array | undefined>>();
  const queue = serialQueue();
  const store: Promise<ThumbStore> = loaded.then((doc) => {
    const created = createThumbStore(root, doc.cacheKey);
    created.prune().catch(logError("thumbnail cache prune failed"));
    return created;
  });
  store.catch(() => undefined);
  let renderer: Promise<ThumbRenderer> | undefined;

  const rendererOf = (): Promise<ThumbRenderer> => {
    if (renderer) return renderer;
    const created = createThumbRenderer(() => {
      if (renderer === created) renderer = undefined;
    });
    created.catch(() => {
      if (renderer === created) renderer = undefined;
    });
    renderer = created;
    return created;
  };

  const render = async (doc: LoadedDocument, screen: Screen): Promise<Uint8Array | undefined> => {
    const model = await doc.screen(screen.id);
    if (!model) return undefined;
    const scale = thumbScale(screen.width, screen.height);
    const draw = await rendererOf();
    const image = await draw(model, scale, Math.max(1, Math.ceil(screen.width * scale)), Math.max(1, Math.ceil(screen.height * scale)));
    return image.toPNG();
  };

  const generate = async (id: string): Promise<Uint8Array | undefined> => {
    const doc = await loaded;
    const screen = findScreen(doc.pages, id);
    if (!screen) return undefined;
    const cache = await store;
    const cached = await cache.read(id);
    if (cached) return cached;
    const png = await queue(() => render(doc, screen));
    if (!png) return undefined;
    await cache.write(id, png).catch(logError("thumbnail cache write failed"));
    return png;
  };

  return (id) => {
    const known = inflight.get(id);
    if (known) return known;
    const pending = generate(id).finally(() => inflight.delete(id));
    inflight.set(id, pending);
    return pending;
  };
};
