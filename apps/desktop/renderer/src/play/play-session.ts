import type { NodeId, Screen } from "@fignya/model";
import { errorMessage } from "../../../shared/error-message";
import { createPlayHistory } from "./play-history";
import { markHotspots } from "./play-hotspots";
import { playKey } from "./play-key";
import { linkAt } from "./play-link";
import { createPlayView } from "./play-view";

export type PlayDeps = { screens: ReadonlyMap<NodeId, Screen>; render: (screen: Screen) => Promise<HTMLElement | undefined> };

const failed = (id: NodeId, reason: string): void => console.error(`fignya: play: screen ${id}: ${reason}`);

export const startPlay = (start: Screen, deps: PlayDeps, onExit: () => void): (() => void) => {
  const history = createPlayHistory(start.id);
  const isScreen = (id: NodeId): boolean => deps.screens.has(id);
  const focused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  let loading = false;
  let closed = false;
  const open = async (screen: Screen, commit: () => void, onFail: () => void): Promise<void> => {
    loading = true;
    const host = await deps.render(screen).catch((error: unknown) => {
      failed(screen.id, errorMessage(error));
      return undefined;
    });
    loading = false;
    if (closed) return;
    if (!host?.shadowRoot) return onFail();
    markHotspots(host.shadowRoot, isScreen);
    commit();
    view.show(screen, host);
  };
  const goTo = (id: NodeId | undefined, commit: () => void): void => {
    const screen = id === undefined ? undefined : deps.screens.get(id);
    if (screen && !loading) void open(screen, commit, () => failed(screen.id, "not loaded"));
  };
  const view = createPlayView((path) => {
    const target = linkAt(path, isScreen);
    if (target === undefined) view.flash();
    else goTo(target, () => history.go(target));
  });
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
