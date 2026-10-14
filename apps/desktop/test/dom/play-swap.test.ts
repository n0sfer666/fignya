import { afterEach, describe, expect, it } from "vitest";
import type { NodeId, Screen, ScreenModel } from "@fignya/model";
import { renderedNode, renderScreen } from "@fignya/render-dom";
import { startPlay } from "../../renderer/src/play/play-session";
import { MODELS } from "./play-swap-nodes";

const imageUrl = (hash: string): string => `fignya://image/${hash}`;

const screen = (id: string): Screen => ({ id, name: `Screen ${id}`, x: 0, y: 0, width: 100, height: 50 });

const SCREENS = new Map(["a", "b"].map((id) => [id, screen(id)]));

const load = async (s: Screen): Promise<ScreenModel | undefined> => MODELS.get(s.id);

const paint = (model: ScreenModel): HTMLElement => renderScreen(model, { imageUrl });

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const shadow = (): ShadowRoot | null | undefined => document.querySelector(".play-stage > [data-screen]")?.shadowRoot;

const at = (selector: string): HTMLElement | null | undefined => shadow()?.querySelector<HTMLElement>(selector);

const variantOf = (selector: string): NodeId | undefined => {
  const el = at(selector);
  const node = el ? renderedNode(el)?.node : undefined;
  return node?.kind === "instance" ? node.componentId : undefined;
};

const fire = (selector: string, event: Event): void => void at(selector)?.dispatchEvent(event);

const click = (selector: string): void => fire(selector, new MouseEvent("click", { bubbles: true, composed: true }));

const point = (selector: string): void => fire(selector, new PointerEvent("pointerover", { bubbles: true, composed: true }));

const leaveAll = (): void => void document.querySelector(".play")?.dispatchEvent(new PointerEvent("pointerleave"));

const flashed = (): boolean | undefined => document.querySelector(".play-stage > [data-screen]")?.classList.contains("flash");

const sessions: (() => void)[] = [];

const started = async (): Promise<void> => {
  sessions.push(startPlay(screen("a"), { screens: SCREENS, load, paint }, () => undefined));
  await settle();
};

afterEach(() => {
  for (const stop of sessions.splice(0)) stop();
});

describe("Play variant swaps", () => {
  it("swaps on click, keeps the overrides and marks the hotspot", async () => {
    await started();
    expect(at('[data-id="btn"]')?.hasAttribute("data-hotspot")).toBe(true);
    click('[data-id="btn"] [data-id="v-label"]');
    expect(variantOf('[data-id="btn"]')).toBe("p");
    expect(at('[data-id="btn"] [data-id="p-label"]')?.textContent).toBe("Buy");
    expect(at('[data-id="btn"]')?.hasAttribute("data-hotspot")).toBe(false);
    expect(flashed()).toBe(false);
  });

  it("swaps on hover and back once the pointer leaves", async () => {
    await started();
    point('[data-id="btn"] [data-id="v-label"]');
    expect(variantOf('[data-id="btn"]')).toBe("h");
    expect(at('[data-id="btn"] [data-id="h-label"]')?.textContent).toBe("Buy");
    point('[data-id="btn"] [data-id="h-label"]');
    expect(variantOf('[data-id="btn"]')).toBe("h");
    point('[data-id="plain"]');
    expect(variantOf('[data-id="btn"]')).toBe("v");
    expect(at('[data-id="btn"] [data-id="v-label"]')?.textContent).toBe("Buy");
  });

  it("swaps on enter and on leave without going back by itself", async () => {
    await started();
    point('[data-id="tog"]');
    expect(variantOf('[data-id="tog"]')).toBe("m2");
    point('[data-id="plain"]');
    expect(variantOf('[data-id="tog"]')).toBe("m3");
  });

  it("swaps a nested instance on its own", async () => {
    await started();
    point('[data-id="card"] [data-id="inner"]');
    expect(variantOf('[data-id="card"] [data-id="inner"]')).toBe("h");
    expect(variantOf('[data-id="btn"]')).toBe("v");
    leaveAll();
    expect(variantOf('[data-id="card"] [data-id="inner"]')).toBe("v");
  });

  it("brings back what the hover variant dropped and keeps the own style", async () => {
    await started();
    point('[data-id="btn"] [data-id="v-label"]');
    expect(at('[data-id="btn"] [data-id="v-badge"]')).toBeNull();
    point('[data-id="plain"]');
    expect(at('[data-id="btn"] [data-id="v-badge"]')?.textContent).toBe("New");
    expect(at('[data-id="btn"]')?.style.opacity).toBe("0.5");
    expect(at('[data-id="btn"]')?.hasAttribute("data-hotspot")).toBe(true);
  });

  it("goes back to the variant before the hover after a click while hovering", async () => {
    await started();
    point('[data-id="btn"] [data-id="v-label"]');
    click('[data-id="btn"] [data-id="h-label"]');
    expect(variantOf('[data-id="btn"]')).toBe("p");
    point('[data-id="plain"]');
    expect(variantOf('[data-id="btn"]')).toBe("v");
  });

  it("moves the hover between two holders of one outer instance", async () => {
    await started();
    point('[data-id="bar"] [data-id="t1"] [data-id="v-label"]');
    point('[data-id="bar"] [data-id="t2"] [data-id="v-label"]');
    expect([variantOf('[data-id="bar"] [data-id="t1"]'), variantOf('[data-id="bar"] [data-id="t2"]')]).toEqual(["v", "h"]);
    leaveAll();
    expect([variantOf('[data-id="bar"] [data-id="t1"]'), variantOf('[data-id="bar"] [data-id="t2"]')]).toEqual(["v", "v"]);
  });

  it("restores an outer and a nested hover swap in reverse order", async () => {
    await started();
    point('[data-id="box"] [data-id="o1-slot"] [data-id="v-label"]');
    expect([variantOf('[data-id="box"]'), variantOf('[data-id="box"] [data-id="o2-slot"]')]).toEqual(["o2", "h"]);
    point('[data-id="box"] [data-id="o2-slot"] [data-id="h-label"]');
    expect([variantOf('[data-id="box"]'), variantOf('[data-id="box"] [data-id="o2-slot"]')]).toEqual(["o2", "h"]);
    point('[data-id="plain"]');
    expect([variantOf('[data-id="box"]'), variantOf('[data-id="box"] [data-id="o1-slot"]')]).toEqual(["o1", "v"]);
  });

  it("flashes the hotspots when a click swap has nowhere to go", async () => {
    await started();
    expect(at('[data-id="lost"]')?.hasAttribute("data-hotspot")).toBe(true);
    click('[data-id="lost"]');
    expect(variantOf('[data-id="lost"]')).toBe("p");
    expect(flashed()).toBe(true);
  });

  it("follows a link before a click swap and shows the screen as in the file on return", async () => {
    await started();
    click('[data-id="btn"]');
    click('[data-id="nav"]');
    await settle();
    expect(document.querySelector(".play-name")?.textContent).toBe("Screen b");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", cancelable: true }));
    await settle();
    expect(variantOf('[data-id="btn"]')).toBe("v");
  });
});
