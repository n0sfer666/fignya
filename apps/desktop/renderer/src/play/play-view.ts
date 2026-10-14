import type { Screen } from "@fignya/model";
import { fitScale } from "./play-fit";
import { FLASH } from "./play-hotspots";
import "./play.css";

export type PlayView = { show: (screen: Screen, host: HTMLElement) => void; flash: () => void; dispose: () => void };

const FLASH_MS = 500;

const part = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ""): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
};

export const createPlayView = (onClick: (path: EventTarget[]) => void, onPointer: (path: EventTarget[]) => void): PlayView => {
  const root = part("div", "play");
  const name = part("span", "play-name");
  const header = part("header", "play-header");
  header.append(name, part("span", "play-hint", "← Back · Esc Exit"));
  const scroll = part("div", "play-scroll");
  const stage = part("div", "play-stage");
  scroll.append(stage);
  root.append(header, scroll);
  const covered = [...document.body.children].filter((el) => !el.hasAttribute("inert"));
  for (const el of covered) el.setAttribute("inert", "");
  document.body.append(root);
  let shown: { screen: Screen; host: HTMLElement } | undefined;
  let flashTimer: ReturnType<typeof setTimeout> | undefined;
  const fit = (): void => {
    if (!shown) return;
    const { screen, host } = shown;
    const scale = fitScale(screen.width, scroll.clientWidth);
    stage.style.width = `${screen.width * scale}px`;
    stage.style.height = `${screen.height * scale}px`;
    host.style.transform = `scale(${scale})`;
  };
  const click = (e: MouseEvent): void => onClick(e.composedPath());
  const pointer = (e: Event): void => onPointer(e.composedPath());
  const away = (): void => onPointer([]);
  root.addEventListener("click", click);
  root.addEventListener("pointerover", pointer);
  root.addEventListener("pointermove", pointer);
  root.addEventListener("pointerleave", away);
  window.addEventListener("resize", fit);
  return {
    show: (screen, host) => {
      clearTimeout(flashTimer);
      host.classList.add("play-screen");
      host.style.width = `${screen.width}px`;
      host.style.height = `${screen.height}px`;
      name.textContent = screen.name;
      stage.replaceChildren(host);
      scroll.scrollTop = 0;
      shown = { screen, host };
      fit();
    },
    flash: () => {
      const host = shown?.host;
      if (!host) return;
      clearTimeout(flashTimer);
      host.classList.add(FLASH);
      flashTimer = setTimeout(() => host.classList.remove(FLASH), FLASH_MS);
    },
    dispose: () => {
      clearTimeout(flashTimer);
      window.removeEventListener("resize", fit);
      for (const el of covered) el.removeAttribute("inert");
      root.remove();
    },
  };
};
