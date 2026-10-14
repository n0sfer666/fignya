import { afterEach, describe, expect, it, vi } from "vitest";
import type { Screen, ScreenModel } from "@fignya/model";
import { renderScreen } from "@fignya/render-dom";
import { startPlay } from "../../renderer/src/play/play-session";
import { frame, modelOf } from "./play-nodes";

const imageUrl = (hash: string): string => `fignya://image/${hash}`;

const screen = (id: string): Screen => ({ id, name: `Screen ${id}`, x: 0, y: 0, width: 100, height: 50 });

const MODELS = new Map([
  ["a", modelOf("a", [frame("a", ["go", "plain"]), frame("go", [], "b"), frame("plain")])],
  ["b", modelOf("b", [frame("b", ["next"]), frame("next", [], "c")])],
]);

const SCREENS = new Map(["a", "b", "c"].map((id) => [id, screen(id)]));

const load = async (s: Screen): Promise<ScreenModel | undefined> => MODELS.get(s.id);

const paint = (model: ScreenModel): HTMLElement => renderScreen(model, { imageUrl });

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const shownName = (): string | null | undefined => document.querySelector(".play-name")?.textContent;

const host = (): Element | null => document.querySelector(".play-stage > [data-screen]");

const click = (id: string): void => {
  const el = host()?.shadowRoot?.querySelector(`[data-id="${id}"]`);
  el?.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
};

const press = (key: string): void => void window.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));

const sessions: (() => void)[] = [];

const play = (onExit: () => void = () => undefined): void => void sessions.push(startPlay(screen("a"), { screens: SCREENS, load, paint }, onExit));

const started = async (onExit?: () => void): Promise<void> => {
  play(onExit);
  await settle();
};

afterEach(() => {
  for (const stop of sessions.splice(0)) stop();
});

describe("startPlay", () => {
  it("shows the start screen with its hotspots", async () => {
    await started();
    expect(shownName()).toBe("Screen a");
    expect(host()?.shadowRoot?.querySelector('[data-id="go"]')?.hasAttribute("data-hotspot")).toBe(true);
  });

  it("follows a link and goes back", async () => {
    await started();
    click("go");
    await settle();
    expect(shownName()).toBe("Screen b");
    press("Backspace");
    await settle();
    expect(shownName()).toBe("Screen a");
    press("ArrowLeft");
    await settle();
    expect(shownName()).toBe("Screen a");
  });

  it("stays on the screen when the target does not load", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await started();
    click("go");
    await settle();
    click("next");
    await settle();
    expect(shownName()).toBe("Screen b");
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
    press("Backspace");
    await settle();
    expect(shownName()).toBe("Screen a");
  });

  it("flashes the hotspots on a click past them", async () => {
    vi.useFakeTimers();
    play();
    await vi.runAllTimersAsync();
    click("plain");
    expect(host()?.classList.contains("flash")).toBe(true);
    vi.advanceTimersByTime(500);
    expect(host()?.classList.contains("flash")).toBe(false);
    vi.useRealTimers();
  });

  it("exits on Escape and keeps keys from the canvas while playing", async () => {
    const onExit = vi.fn();
    const canvasKeys = vi.fn();
    window.addEventListener("keydown", canvasKeys);
    await started(onExit);
    press("z");
    expect(canvasKeys).not.toHaveBeenCalled();
    press("Escape");
    expect(onExit).toHaveBeenCalledOnce();
    expect(document.querySelector(".play")).toBeNull();
    press("z");
    expect(canvasKeys).toHaveBeenCalledOnce();
    window.removeEventListener("keydown", canvasKeys);
  });

  it("covers the window: the rest is inert while playing and focus comes back on exit", async () => {
    const under = document.createElement("main");
    const field = document.createElement("input");
    under.append(field);
    document.body.append(under);
    field.focus();
    await started();
    expect([under.hasAttribute("inert"), document.activeElement === field]).toEqual([true, false]);
    press("Escape");
    expect([under.hasAttribute("inert"), document.activeElement === field]).toEqual([false, true]);
    under.remove();
  });

  it("ignores input while a screen loads and drops a load finished after exit", async () => {
    let release = (): void => undefined;
    const gated = (s: Screen): Promise<ScreenModel | undefined> =>
      s.id === "a" ? load(s) : new Promise((resolve) => (release = () => void load(s).then(resolve)));
    const onExit = vi.fn();
    sessions.push(startPlay(screen("a"), { screens: SCREENS, load: gated, paint }, onExit));
    await settle();
    click("go");
    click("go");
    press("Backspace");
    release();
    await settle();
    expect(shownName()).toBe("Screen b");
    press("Backspace");
    await settle();
    expect(shownName()).toBe("Screen a");
    click("go");
    press("Escape");
    release();
    await settle();
    expect([document.querySelector(".play"), onExit.mock.calls.length]).toEqual([null, 1]);
  });

  it("leaves Play when the start screen does not load", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onExit = vi.fn();
    sessions.push(startPlay(screen("c"), { screens: SCREENS, load, paint }, onExit));
    await settle();
    expect([document.querySelector(".play"), onExit.mock.calls.length, error.mock.calls.length]).toEqual([null, 1, 1]);
    error.mockRestore();
  });
});
