import { contentOf, type Page, type Screen } from "@fignya/model";
import type { ThumbFocus } from "../shared/api";
import type { LoadedDocument } from "./load-document";
import { retrying } from "./retrying";
import { screenRevisions } from "./screen-revisions";
import { priorityQueue } from "./priority-queue";
import { fontKey } from "./thumb-cache";
import { thumbGeometry } from "./thumb-geometry";
import { createThumbRenderer, type ThumbRenderer } from "./thumb-renderer";
import { effectiveTier } from "./thumb-scale";
import { createThumbStore, type ThumbStore } from "./thumb-store";
import { inFocus, onPage, type ThumbTag } from "./thumb-tags";

export type Thumbnails = {
  image: (screenId: string, tier: number) => Promise<Uint8Array | undefined>;
  activate: (pageId: string) => void;
  focusScreens: (focus: ThumbFocus) => void;
  changed: (screenId: string) => number;
  touched: () => void;
};

type Located = { page: Page; screen: Screen };

const RENDER_ATTEMPTS = 2;
const FIRST_RENDER_TIMEOUT_MS = 3000;
const RETRY_RENDER_TIMEOUT_MS = 15000;

const logError = (what: string) => (error: unknown): void => console.error(`fignya: ${what}: ${String(error)}`);

const locate = (pages: Page[], id: string): Located | undefined => {
  const page = pages.find((p) => p.screens.some((s) => s.id === id));
  const screen = page?.screens.find((s) => s.id === id);
  return page && screen ? { page, screen } : undefined;
};

export const createThumbnails = (loaded: Promise<LoadedDocument>, root: string, fontsVersion: () => Promise<string>): Thumbnails => {
  const inflight = new Map<string, Promise<Uint8Array | undefined>>();
  const queue = priorityQueue<ThumbTag>();
  const stores = new Map<string, Promise<ThumbStore>>();
  const revisions = screenRevisions();
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

  const storeFor = (version: string): Promise<ThumbStore> => {
    const known = stores.get(version);
    if (known) return known;
    const created = loaded.then((doc) => {
      const store = createThumbStore(root, fontKey(doc.cacheKey, version));
      store.prune().catch(logError("thumbnail cache prune failed"));
      return store;
    });
    created.catch(() => undefined);
    stores.set(version, created);
    return created;
  };

  const render = async (doc: LoadedDocument, screen: Screen, tier: number, timeoutMs: number): Promise<Uint8Array | undefined> => {
    const model = await doc.screen(screen.id);
    if (!model) return undefined;
    const { scale, origin, width, height } = thumbGeometry(screen, tier);
    const draw = await rendererOf();
    const image = await draw({ model, scale, origin }, width, height, timeoutMs);
    return image.toPNG();
  };

  const generate = async (doc: LoadedDocument, { page, screen }: Located, tier: number, version: string): Promise<Uint8Array | undefined> => {
    const cache = await storeFor(version);
    const cached = revisions.of(screen.id) === 0 ? await cache.read(screen.id, tier) : undefined;
    if (cached) return cached;
    const tag = { page: page.id, screen, tier };
    let timeoutMs = FIRST_RENDER_TIMEOUT_MS;
    const attempt = (): Promise<Uint8Array | undefined> => queue.run(tier, tag, () => render(doc, screen, tier, timeoutMs));
    const beforeRetry = (error: unknown): void => {
      if (!queue.wants(tag)) throw error;
      logError(`thumbnail ${screen.id} failed, retrying`)(error);
      timeoutMs = RETRY_RENDER_TIMEOUT_MS;
    };
    const png = await retrying(RENDER_ATTEMPTS, attempt, beforeRetry);
    if (!png || revisions.edited()) return png;
    await cache.write(screen.id, tier, png).catch(logError("thumbnail cache write failed"));
    return png;
  };

  const image = async (id: string, requested: number): Promise<Uint8Array | undefined> => {
    const doc = await loaded;
    const located = locate(doc.pages, id);
    if (!located) return undefined;
    const box = contentOf(located.screen);
    const tier = effectiveTier(box.width, box.height, requested);
    const version = await fontsVersion();
    const key = `${id}@${tier}@${version}@${revisions.of(id)}`;
    const known = inflight.get(key);
    if (known) return known;
    const pending = generate(doc, located, tier, version).finally(() => inflight.delete(key));
    inflight.set(key, pending);
    return pending;
  };

  return { image, activate: (pageId) => queue.keepOnly(onPage(pageId)), focusScreens: (focus) => queue.prefer(inFocus(focus)), changed: revisions.bump, touched: revisions.touch };
};
