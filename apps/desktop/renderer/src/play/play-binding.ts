import type { Screen } from "@fignya/model";
import type { FignyaApi } from "../../../shared/api";
import { isPlayShortcut } from "./play-key";

export type PlayApi = Pick<FignyaApi, "playAvailable" | "onPlayRequest">;

export type PlayStart = (screen: Screen, onExit: () => void) => () => void;

export type PlayBinding = { onLive: (screenId: string | undefined) => void; dispose: () => void };

export const bindPlay = (api: PlayApi, screens: () => Screen[], start: PlayStart, onPlaying: (playing: boolean) => void = () => undefined): PlayBinding => {
  let live: string | undefined;
  let stop: (() => void) | undefined;
  const onLive = (screenId: string | undefined): void => {
    live = screenId;
    api.playAvailable(screenId);
  };
  const request = (): void => {
    const screen = screens().find((s) => s.id === live);
    if (!screen || stop) return;
    onPlaying(true);
    stop = start(screen, () => {
      stop = undefined;
      onPlaying(false);
    });
  };
  const keydown = (e: KeyboardEvent): void => {
    if (!isPlayShortcut(e)) return;
    e.preventDefault();
    request();
  };
  const off = api.onPlayRequest(request);
  window.addEventListener("keydown", keydown);
  onLive(undefined);
  return {
    onLive,
    dispose: () => {
      off();
      window.removeEventListener("keydown", keydown);
      stop?.();
      onLive(undefined);
    },
  };
};
