import { BASE_TIER, tierFor } from "../../../shared/thumb-tiers";
import { thumbUrl } from "../../../shared/urls";
import { watchDensity } from "./watch-density";

const SETTLE_MS = 200;

export type Sharpener = { schedule: (zoom: number) => void; refresh: () => void; dispose: () => void };

const overlaps = (a: DOMRect, b: DOMRect): boolean => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;

const tierIn = (value: string | undefined): number | undefined => (value === undefined ? undefined : Number(value));

const isShown = (img: HTMLImageElement): boolean => img.complete && img.naturalWidth > 0;

const swap = (frame: HTMLElement, img: HTMLImageElement, id: string, tier: number): void => {
  const wanted = String(tier);
  frame.dataset.wanted = wanted;
  const next = new Image();
  next.src = thumbUrl(id, tier);
  next.decode().then(
    () => {
      if (frame.dataset.wanted !== wanted) return;
      img.src = next.src;
      frame.dataset.tier = wanted;
    },
    () => {
      if (frame.dataset.wanted === wanted) delete frame.dataset.wanted;
    },
  );
};

const retier = (frame: HTMLElement, tier: number): void => {
  const img = frame.querySelector("img");
  const id = frame.dataset.screenId;
  const current = tierIn(frame.dataset.wanted) ?? tierIn(frame.dataset.tier) ?? BASE_TIER;
  if (!img || !id || current === tier || frame.classList.contains("live") || !isShown(img)) return;
  swap(frame, img, id, tier);
};

export const createSharpener = (viewport: HTMLElement, world: HTMLElement): Sharpener => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let zoom = 1;
  const sharpen = (): void => {
    const tier = tierFor(zoom * window.devicePixelRatio);
    const bounds = viewport.getBoundingClientRect();
    for (const frame of world.querySelectorAll<HTMLElement>(".screen")) {
      retier(frame, overlaps(frame.getBoundingClientRect(), bounds) ? tier : BASE_TIER);
    }
  };
  const refresh = (): void => {
    clearTimeout(timer);
    timer = setTimeout(sharpen, SETTLE_MS);
  };
  const unwatch = watchDensity(refresh);
  world.addEventListener("load", refresh, true);
  return {
    schedule: (next) => {
      zoom = next;
      refresh();
    },
    refresh,
    dispose: () => {
      clearTimeout(timer);
      unwatch();
      world.removeEventListener("load", refresh, true);
    },
  };
};
