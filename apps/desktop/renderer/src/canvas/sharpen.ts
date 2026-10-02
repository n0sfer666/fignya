import type { ThumbFocus } from "../../../shared/api";
import { BASE_TIER, tierFor } from "../../../shared/thumb-tiers";
import { thumbUrl } from "../../../shared/urls";
import { changesOnly } from "./changes-only";
import { decodedWithin } from "./decoded-within";
import { settleTimer } from "./settle-timer";
import { watchDensity } from "./watch-density";

const SETTLE_MS = 200;

const DECODE_MS = 1000;

export type Sharpener = { schedule: (zoom: number) => void; refresh: () => void; restart: () => void; dispose: () => void };

const overlaps = (a: DOMRect, b: DOMRect): boolean => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;

const tierIn = (value: string | undefined): number | undefined => (value === undefined ? undefined : Number(value));

const isShown = (img: HTMLImageElement): boolean => img.complete && img.naturalWidth > 0;

const swaps = new WeakMap<HTMLElement, HTMLImageElement>();

const swap = (frame: HTMLElement, img: HTMLImageElement, url: string, tier: number): void => {
  const wanted = String(tier);
  const next = new Image();
  frame.dataset.wanted = wanted;
  swaps.set(frame, next);
  const current = (): boolean => swaps.get(frame) === next;
  const release = (): void => {
    if (!current()) return;
    swaps.delete(frame);
    delete frame.dataset.wanted;
  };
  const show = (): void => {
    if (!current()) return;
    swaps.delete(frame);
    img.src = next.src;
    frame.dataset.tier = wanted;
  };
  next.onload = () => {
    if (current()) void decodedWithin(() => next.decode(), DECODE_MS).then(show, release);
  };
  next.onerror = release;
  next.src = url;
};

const retier = (frame: HTMLElement, tier: number, version: string): void => {
  const img = frame.querySelector("img");
  const id = frame.dataset.screenId;
  const current = tierIn(frame.dataset.wanted) ?? tierIn(frame.dataset.tier) ?? BASE_TIER;
  if (!img || !id || current === tier || frame.classList.contains("live") || !isShown(img)) return;
  swap(frame, img, thumbUrl(id, tier, version), tier);
};

const rebase = (frame: HTMLElement, version: string): void => {
  const img = frame.querySelector("img");
  const id = frame.dataset.screenId;
  swaps.delete(frame);
  delete frame.dataset.wanted;
  delete frame.dataset.tier;
  if (img && id) img.src = thumbUrl(id, BASE_TIER, version);
};

export const createSharpener = (viewport: HTMLElement, world: HTMLElement, version: () => string, focusScreens: (focus: ThumbFocus) => void): Sharpener => {
  let zoom = 1;
  const report = changesOnly((next: ThumbFocus) => `${next.tier}|${next.screenIds.join()}`, focusScreens);
  const sharpen = (): void => {
    const tier = tierFor(zoom * window.devicePixelRatio);
    const bounds = viewport.getBoundingClientRect();
    const visible: string[] = [];
    for (const frame of world.querySelectorAll<HTMLElement>(".screen")) {
      const shown = overlaps(frame.getBoundingClientRect(), bounds);
      if (shown && frame.dataset.screenId) visible.push(frame.dataset.screenId);
      retier(frame, shown ? tier : BASE_TIER, version());
    }
    report({ tier, screenIds: visible });
  };
  const timer = settleTimer(SETTLE_MS, sharpen);
  const refresh = timer.restart;
  const unwatch = watchDensity(refresh);
  world.addEventListener("load", timer.ensure, true);
  return {
    schedule: (next) => {
      zoom = next;
      refresh();
    },
    refresh,
    restart: () => {
      for (const frame of world.querySelectorAll<HTMLElement>(".screen")) rebase(frame, version());
      refresh();
    },
    dispose: () => {
      timer.cancel();
      unwatch();
      world.removeEventListener("load", timer.ensure, true);
    },
  };
};
