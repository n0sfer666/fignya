import type { Page, Screen } from "@fignya/model";
import type { LoadedDocument } from "./load-document";
import { retrying } from "./retrying";
import { priorityQueue } from "./priority-queue";
import { createThumbRenderer, type ThumbRenderer } from "./thumb-renderer";
import { effectiveTier, thumbScale } from "./thumb-scale";
import { createThumbStore, type ThumbStore } from "./thumb-store";

export type Thumbnails = (screenId: string, tier: number) => Promise<Uint8Array | undefined>;

const RENDER_ATTEMPTS = 2;

const logError = (what: string) => (error: unknown): void => console.error(`fignya: ${what}: ${String(error)}`);

const findScreen = (pages: Page[], id: string): Screen | undefined =>
  pages.flatMap((p) => p.screens).find((s) => s.id === id);

export const createThumbnails = (loaded: Promise<LoadedDocument>, root: string): Thumbnails => {
  const inflight = new Map<string, Promise<Uint8Array | undefined>>();
  const queue = priorityQueue();
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

  const render = async (doc: LoadedDocument, screen: Screen, tier: number): Promise<Uint8Array | undefined> => {
    const model = await doc.screen(screen.id);
    if (!model) return undefined;
    const scale = thumbScale(screen.width, screen.height, tier);
    const draw = await rendererOf();
    const image = await draw(model, scale, Math.max(1, Math.ceil(screen.width * scale)), Math.max(1, Math.ceil(screen.height * scale)));
    return image.toPNG();
  };

  const generate = async (doc: LoadedDocument, screen: Screen, tier: number): Promise<Uint8Array | undefined> => {
    const cache = await store;
    const cached = await cache.read(screen.id, tier);
    if (cached) return cached;
    const attempt = (): Promise<Uint8Array | undefined> => render(doc, screen, tier);
    const png = await queue(tier, () => retrying(RENDER_ATTEMPTS, attempt, logError(`thumbnail ${screen.id} failed, retrying`)));
    if (!png) return undefined;
    await cache.write(screen.id, tier, png).catch(logError("thumbnail cache write failed"));
    return png;
  };

  return async (id, requested) => {
    const doc = await loaded;
    const screen = findScreen(doc.pages, id);
    if (!screen) return undefined;
    const tier = effectiveTier(screen.width, screen.height, requested);
    const key = `${id}@${tier}`;
    const known = inflight.get(key);
    if (known) return known;
    const pending = generate(doc, screen, tier).finally(() => inflight.delete(key));
    inflight.set(key, pending);
    return pending;
  };
};
