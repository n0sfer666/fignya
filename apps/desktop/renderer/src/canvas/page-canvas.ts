import type { Page, Screen } from "@fignya/model";
import { thumbUrl } from "../../../shared/urls";
import { bindGestures } from "./gestures";
import { boundsOf, fitView, panBy, zoomAround, type View } from "./viewport";

const FIT_PADDING = 48;
const FOCUS_PADDING = 32;

export type OpenScreen = (screen: Screen) => Promise<HTMLElement | undefined>;

export type PageCanvas = {
  show: (page: Page) => void;
  focus: (screenId: string) => void;
  open: (screenId: string) => Promise<void>;
  close: () => void;
  dispose: () => void;
};

const frameOf = (screen: Screen): HTMLElement => {
  const frame = document.createElement("div");
  frame.className = "screen";
  frame.dataset.screenId = screen.id;
  frame.title = screen.name;
  frame.style.cssText = `left:${screen.x}px;top:${screen.y}px;width:${screen.width}px;height:${screen.height}px`;
  const img = document.createElement("img");
  img.loading = "lazy";
  img.decoding = "async";
  img.draggable = false;
  img.src = thumbUrl(screen.id);
  frame.append(img);
  return frame;
};

export const createPageCanvas = (el: HTMLElement, openScreen: OpenScreen): PageCanvas => {
  const world = document.createElement("div");
  world.className = "world";
  el.append(world);
  let view: View = { x: 0, y: 0, zoom: 1 };
  let screens = new Map<string, Screen>();
  let live: { id: string; host: HTMLElement } | undefined;
  let pending: string | undefined;

  const apply = (next: View): void => {
    view = next;
    world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.zoom})`;
  };
  const frameEl = (id: string): HTMLElement | undefined =>
    [...world.children].find((c): c is HTMLElement => c instanceof HTMLElement && c.dataset.screenId === id);
  const unmount = (): void => {
    if (!live) return;
    live.host.remove();
    frameEl(live.id)?.classList.remove("live");
    live = undefined;
  };
  const close = (): void => {
    pending = undefined;
    unmount();
  };
  const open = async (id: string): Promise<void> => {
    const screen = screens.get(id);
    if (!screen || live?.id === id) return;
    pending = id;
    const host = await openScreen(screen).catch((error: unknown) => {
      console.error(`fignya: screen ${id} failed to open: ${String(error)}`);
      return undefined;
    });
    if (pending !== id) return;
    pending = undefined;
    const frame = frameEl(id);
    if (!host || !frame) return;
    unmount();
    frame.classList.add("live");
    frame.append(host);
    live = { id, host };
  };
  const focus = (id: string): void => {
    const screen = screens.get(id);
    if (screen) apply(fitView(screen, el.clientWidth, el.clientHeight, FOCUS_PADDING));
  };
  const show = (page: Page): void => {
    close();
    screens = new Map(page.screens.map((s) => [s.id, s]));
    world.replaceChildren(...page.screens.map(frameOf));
    const bounds = boundsOf(page.screens);
    apply(bounds ? fitView(bounds, el.clientWidth, el.clientHeight, FIT_PADDING) : { x: 0, y: 0, zoom: 1 });
  };
  const unbind = bindGestures(el, {
    pan: (dx, dy) => apply(panBy(view, dx, dy)),
    zoom: (factor, x, y) => apply(zoomAround(view, factor, x, y)),
    click: (target) => {
      const id = target instanceof Element ? target.closest<HTMLElement>(".screen")?.dataset.screenId : undefined;
      if (id) void open(id);
    },
  });
  const keydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") close();
  };
  window.addEventListener("keydown", keydown);
  return {
    show,
    focus,
    open,
    close,
    dispose: () => {
      unbind();
      window.removeEventListener("keydown", keydown);
      world.remove();
    },
  };
};
