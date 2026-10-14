import type { NodeId, Screen, ScreenModel } from "@fignya/model";
import { errorMessage } from "../../../shared/error-message";
import { clickAt, isHotspot } from "./play-click";
import { createPlayHistory } from "./play-history";
import { markHotspots, markSubtree } from "./play-hotspots";
import { createHover, type Hover } from "./play-hover";
import { playKey } from "./play-key";
import { createVariants, type Variants } from "./play-variants";
import { createPlayView } from "./play-view";

export type PlayDeps = {
  screens: ReadonlyMap<NodeId, Screen>;
  load: (screen: Screen) => Promise<ScreenModel | undefined>;
  paint: (model: ScreenModel) => HTMLElement;
};

const failed = (id: NodeId, reason: string): void => console.error(`fignya: play: screen ${id}: ${reason}`);

export const startPlay = (start: Screen, deps: PlayDeps, onExit: () => void): (() => void) => {
  const history = createPlayHistory(start.id);
  const isScreen = (id: NodeId): boolean => deps.screens.has(id);
  const isHot = (el: Element): boolean => isHotspot(el, isScreen);
  const focused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  let loading = false;
  let closed = false;
  let variants: Variants | undefined;
  let hover: Hover = () => undefined;
  const open = async (screen: Screen, commit: () => void, onFail: () => void): Promise<void> => {
    loading = true;
    const painted = await deps
      .load(screen)
      .then((model) => model && { model, host: deps.paint(model) })
      .catch((error: unknown) => {
        failed(screen.id, errorMessage(error));
        return undefined;
      });
    loading = false;
    if (closed) return;
    const root = painted?.host.shadowRoot;
    if (!painted || !root) return onFail();
    markHotspots(root, isHot);
    variants = createVariants(root, painted.model.nodes, (el) => markSubtree(el, isHot));
    hover = createHover(variants);
    commit();
    view.show(screen, painted.host);
  };
  const goTo = (id: NodeId | undefined, commit: () => void): void => {
    const screen = id === undefined ? undefined : deps.screens.get(id);
    if (screen && !loading) void open(screen, commit, () => failed(screen.id, "not loaded"));
  };
  const view = createPlayView(
    (path) => {
      const action = clickAt(path, isScreen);
      if (action?.kind === "link") goTo(action.to, () => history.go(action.to));
      else if (!action || !variants?.swap(action.holder, action.to)) view.flash();
    },
    (path) => hover(path),
  );
  const exit = (): void => {
    if (closed) return;
    closed = true;
    window.removeEventListener("keydown", keydown, true);
    view.dispose();
    if (focused?.isConnected) focused.focus();
    onExit();
  };
  const keydown = (e: KeyboardEvent): void => {
    e.stopImmediatePropagation();
    const key = playKey(e);
    if (!key) return;
    e.preventDefault();
    if (key === "exit") exit();
    else goTo(history.previous(), () => history.back());
  };
  focused?.blur();
  window.addEventListener("keydown", keydown, true);
  void open(start, () => undefined, () => {
    failed(start.id, "not loaded");
    exit();
  });
  return exit;
};
