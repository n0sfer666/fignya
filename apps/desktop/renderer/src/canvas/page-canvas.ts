import { contentOf, type NodeId, type Page, type Screen } from "@fignya/model";
import type { RenderedNode } from "@fignya/render-dom";
import type { CanvasZoom, ThumbFocus } from "../../../shared/api";
import { BASE_TIER } from "../../../shared/thumb-tiers";
import { thumbUrl } from "../../../shared/urls";
import { contentClip } from "./content-clip";
import { findTarget } from "./find-target";
import { bindGestures } from "./gestures";
import { loadingFor } from "./loading-for";
import { createLiveSelection } from "./live-selection";
import { createSharpener } from "./sharpen";
import { boundsOf, fitView, panBy, zoomAround, zoomStep, type View } from "./viewport";

const FIT_PADDING = 48;
const FOCUS_PADDING = 32;

export type OpenScreen = (screen: Screen) => Promise<HTMLElement | undefined>;

export type PageCanvas = {
  show: (page: Page) => void;
  focus: (screenId: string) => void;
  zoomStep: (step: CanvasZoom) => void;
  open: (screenId: string) => Promise<void>;
  mark: (screenId: string, target: NodeId[] | undefined) => void;
  close: () => void;
  reload: (fontsVersion: string) => void;
  dispose: () => void;
};

const frameOf = (screen: Screen, version: string): HTMLElement => {
  const frame = document.createElement("div");
  frame.className = "screen";
  frame.dataset.screenId = screen.id;
  frame.title = screen.name;
  frame.style.cssText = `left:${screen.x}px;top:${screen.y}px;width:${screen.width}px;height:${screen.height}px`;
  const img = document.createElement("img");
  const box = contentOf(screen);
  img.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px`;
  img.loading = loadingFor(document.visibilityState);
  img.decoding = "async";
  img.draggable = false;
  img.src = thumbUrl(screen.id, BASE_TIER, version);
  frame.append(img);
  return frame;
};

export type SelectNode = (node: RenderedNode | undefined) => void;

export const createPageCanvas = (el: HTMLElement, openScreen: OpenScreen, focusScreens: (focus: ThumbFocus) => void, onSelect: SelectNode): PageCanvas => {
  const world = document.createElement("div");
  world.className = "world";
  el.append(world);
  let version = "";
  const sharpener = createSharpener(el, world, () => version, focusScreens);
  let view: View = { x: 0, y: 0, zoom: 1 };
  let screens = new Map<string, Screen>();
  let live: { id: string; host: HTMLElement } | undefined;
  let pending: string | undefined;
  const selection = createLiveSelection(() => view.zoom, onSelect);

  const apply = (next: View): void => {
    view = next;
    world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.zoom})`;
    world.style.setProperty("--zoom", String(view.zoom));
    sharpener.schedule(view.zoom);
  };
  const frameEl = (id: string): HTMLElement | undefined =>
    [...world.children].find((c): c is HTMLElement => c instanceof HTMLElement && c.dataset.screenId === id);
  const unmount = (): void => {
    selection.attach(undefined);
    if (!live) return;
    live.host.remove();
    frameEl(live.id)?.classList.remove("live");
    live = undefined;
  };
  const close = (): void => {
    pending = undefined;
    unmount();
    sharpener.refresh();
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
    host.style.clipPath = contentClip(screen);
    frame.append(host);
    live = { id, host };
    selection.attach({ frame, host });
  };
  const mark = (screenId: string, target: NodeId[] | undefined): void => {
    const current = live;
    const screen = screens.get(screenId);
    if (!screen || current?.id !== screenId) return;
    const root = current.host.shadowRoot;
    const bounds = selection.select(target && root ? findTarget(root, target) : undefined);
    if (!bounds) return;
    const { x, y, width, height } = bounds;
    apply(fitView({ x: screen.x + x, y: screen.y + y, width, height }, el.clientWidth, el.clientHeight, FOCUS_PADDING));
  };
  const focus = (id: string): void => {
    const screen = screens.get(id);
    if (screen) apply(fitView(screen, el.clientWidth, el.clientHeight, FOCUS_PADDING));
  };
  const show = (page: Page): void => {
    close();
    screens = new Map(page.screens.map((s) => [s.id, s]));
    world.replaceChildren(...page.screens.map((s) => frameOf(s, version)));
    const bounds = boundsOf(page.screens);
    apply(bounds ? fitView(bounds, el.clientWidth, el.clientHeight, FIT_PADDING) : { x: 0, y: 0, zoom: 1 });
  };
  const unbind = bindGestures(el, {
    pan: (dx, dy) => apply(panBy(view, dx, dy)),
    zoom: (factor, x, y) => apply(zoomAround(view, factor, x, y)),
    click: (tap) => {
      if (selection.click(tap)) return;
      const id = tap.target instanceof Element ? tap.target.closest<HTMLElement>(".screen")?.dataset.screenId : undefined;
      if (id && id !== live?.id) void open(id);
      else selection.select(undefined);
    },
    hover: (point) => selection.hover(point),
  });
  const keydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && !selection.clear()) close();
  };
  window.addEventListener("keydown", keydown);
  return {
    show,
    focus,
    zoomStep: (step) => apply(zoomStep(view, step, el.clientWidth / 2, el.clientHeight / 2)),
    open,
    mark,
    close,
    reload: (next) => {
      if (next === version) return;
      version = next;
      sharpener.restart();
    },
    dispose: () => {
      unbind();
      sharpener.dispose();
      window.removeEventListener("keydown", keydown);
      selection.attach(undefined);
      world.remove();
    },
  };
};
