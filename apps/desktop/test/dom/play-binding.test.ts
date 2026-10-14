import { describe, expect, it } from "vitest";
import type { Screen } from "@fignya/model";
import { bindPlay, type PlayApi } from "../../renderer/src/play/play-binding";

const screen: Screen = { id: "1:2", name: "Home", x: 0, y: 0, width: 10, height: 10 };

const fakeApi = () => {
  const available: (string | undefined)[] = [];
  let request = (): void => undefined;
  let subscribed = true;
  const api: PlayApi = {
    playAvailable: (id) => void available.push(id),
    onPlayRequest: (handler) => {
      request = handler;
      return () => {
        subscribed = false;
      };
    },
  };
  return { api, available, request: () => request(), subscribed: () => subscribed };
};

const recorder = () => {
  const runs: string[] = [];
  const exits: (() => void)[] = [];
  let stopped = 0;
  const start = (s: Screen, onExit: () => void): (() => void) => {
    runs.push(s.id);
    exits.push(onExit);
    return () => {
      stopped += 1;
      onExit();
    };
  };
  return { start, runs, exit: () => exits.at(-1)?.(), stopped: () => stopped };
};

const shortcut = (): void => void window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", altKey: true, metaKey: true }));

describe("bindPlay", () => {
  it("starts unavailable and follows the live screen", () => {
    const fake = fakeApi();
    const binding = bindPlay(fake.api, () => [screen], recorder().start);
    binding.onLive("1:2");
    binding.onLive(undefined);
    expect(fake.available).toEqual([undefined, "1:2", undefined]);
    binding.dispose();
  });

  it("plays the live screen once at a time from the menu and the shortcut", () => {
    const fake = fakeApi();
    const rec = recorder();
    const binding = bindPlay(fake.api, () => [screen], rec.start);
    binding.onLive("1:2");
    fake.request();
    shortcut();
    expect(rec.runs).toEqual(["1:2"]);
    rec.exit();
    shortcut();
    expect(rec.runs).toEqual(["1:2", "1:2"]);
    binding.dispose();
  });

  it("ignores requests without a live screen", () => {
    const fake = fakeApi();
    const rec = recorder();
    const binding = bindPlay(fake.api, () => [screen], rec.start);
    fake.request();
    shortcut();
    expect(rec.runs).toEqual([]);
    binding.dispose();
  });

  it("stops playing, unsubscribes and disables Play on dispose", () => {
    const fake = fakeApi();
    const rec = recorder();
    const binding = bindPlay(fake.api, () => [screen], rec.start);
    binding.onLive("1:2");
    fake.request();
    binding.dispose();
    shortcut();
    expect([rec.stopped(), rec.runs.length, fake.subscribed(), fake.available.at(-1)]).toEqual([1, 1, false, undefined]);
  });

  it("reports when Play starts and ends", () => {
    const fake = fakeApi();
    const rec = recorder();
    const states: boolean[] = [];
    const binding = bindPlay(fake.api, () => [screen], rec.start, (on) => void states.push(on));
    binding.onLive("1:2");
    fake.request();
    rec.exit();
    expect(states).toEqual([true, false]);
    binding.dispose();
  });
});
