import { mkdirSync } from "node:fs";
import { clock, evaluator, imported, isRec, session, setElectronVisible, sleep, waitFor } from "./cdp";
import { connectMain } from "./main-cdp";
import { createUi, META, ROOT } from "./ui";

const ALT = 1;
const port = process.env.PORT ?? "9445";
const inspect = process.env.INSPECT ?? "9446";
const tag = process.argv[2] ?? "run";
const screenId = process.argv[3] ?? "9402:158357";
const dir = `${import.meta.dir}/out/play-${tag}`;
mkdirSync(dir, { recursive: true });
const log = clock();
const send = await session(port, 60000, 60000);
const ev = evaluator(send);
const main = await connectMain(inspect);
const ui = createUi(send, ev, dir);
let failed = 0;

const check = (ok: boolean, what: string): void => {
  if (!ok) failed += 1;
  log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

const ELECTRON = `(globalThis.require ?? process.mainModule.require)("electron")`;
const PLAY_HOST = `document.querySelector(".play-stage > [data-screen]")`;

const itemEnabled = (id: string): Promise<unknown> => main(`${ELECTRON}.Menu.getApplicationMenu()?.getMenuItemById(${JSON.stringify(id)})?.enabled`);
const menuEnabled = (): Promise<unknown> => itemEnabled("play-screen");
const playing = async (): Promise<boolean> => (await ev(`!!document.querySelector(".play")`)) === true;
const shown = async (): Promise<unknown> => ev(`${PLAY_HOST}?.dataset.screen`);
const shortcut = (): Promise<void> => ui.key("Enter", "Enter", 13, ALT | META);
const showing = (id: unknown): Promise<boolean> => waitFor(async () => (await shown()) === id, 10000);

const hotspotPoint = async (): Promise<{ x: number; y: number } | undefined> => {
  const point = await ev(`(() => {
    const root = ${PLAY_HOST}?.shadowRoot;
    for (const el of root?.querySelectorAll("[data-hotspot]") ?? []) {
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      if (r.width > 4 && r.height > 4 && root.elementFromPoint(x, y)?.closest("[data-hotspot]") === el) return { x, y };
    }
    return undefined;
  })()`);
  return isRec(point) && typeof point.x === "number" && typeof point.y === "number" ? { x: point.x, y: point.y } : undefined;
};

if (!(await imported(ev))) {
  log("import did not finish");
  process.exit(2);
}
setElectronVisible(port, true);
await waitFor(async () => (await ev("document.visibilityState")) === "visible", 5000);
check((await menuEnabled()) === false, "Play menu item disabled without a live screen");
await shortcut();
await sleep(500);
check(!(await playing()), "⌥⌘↩ without a live screen does nothing");
check(await ui.openScreen(screenId), `search ${screenId} opens the screen`);
check(await waitFor(async () => (await menuEnabled()) === true, 5000), "Play menu item enabled with a live screen");

const rootId = await ev(`${ROOT}?.querySelector("[data-id]")?.dataset.id`);
await ev(`window.fignya.edit({ target: [${JSON.stringify(rootId)}], style: { opacity: 0.5 } })`);
check(await waitFor(async () => (await ev(`getComputedStyle(${ROOT}.querySelector("[data-id]")).opacity`)) === "0.5", 5000), "edit redraws the live screen");

const CANVAS = `JSON.stringify({ live: document.querySelector(".screen.live")?.dataset.screenId, selection: document.querySelector(".node-selection")?.getAttribute("style"), inspector: document.querySelector(".inspector")?.textContent })`;
const before = await ev(CANVAS);
check((await ev(`!!document.querySelector(".node-selection")`)) === true, "a layer is selected before Play");
await shortcut();
check(await showing(screenId), "⌥⌘↩ plays the live screen");
const name = await ev(`document.querySelector(".play-name")?.textContent`);
log(`playing "${String(name)}"`);
check(typeof name === "string" && name.length > 0, "header names the screen");
check((await ev(`getComputedStyle(${PLAY_HOST}.shadowRoot.querySelector("[data-id]")).opacity`)) === "0.5", "Play shows the edit");
const fit = await ev(`(() => { const s = document.querySelector(".play-stage").getBoundingClientRect(); return { stage: s.width, window: innerWidth, transform: ${PLAY_HOST}.style.transform }; })()`);
log(`fit ${JSON.stringify(fit)}`);
check(isRec(fit) && typeof fit.stage === "number" && typeof fit.window === "number" && fit.stage <= fit.window, "screen fits the window width");
const hotspots = await ev(`${PLAY_HOST}.shadowRoot.querySelectorAll("[data-hotspot]").length`);
log(`hotspots: ${String(hotspots)}`);
check(typeof hotspots === "number" && hotspots > 0, "screen has hotspots");
check(await waitFor(async () => (await itemEnabled("export-screen")) === false, 5000), "Export is disabled while playing");
check((await ev(`!!document.querySelector(".layout")?.closest("[inert]")`)) === true, "the window under Play is inert");
await ui.shot("start");

await main(`${ELECTRON}.Menu.getApplicationMenu().getMenuItemById("play-screen").click()`);
await sleep(500);
check((await ev(`document.querySelectorAll(".play").length`)) === 1, "View → Play while playing opens no second Play");

const header = await ev(`(() => { const r = document.querySelector(".play-header").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
if (isRec(header) && typeof header.x === "number" && typeof header.y === "number") await ui.click(header.x, header.y);
check((await ev(`${PLAY_HOST}.classList.contains("flash")`)) === true, "a click past the links flashes the hotspots");
await ui.shot("flash");
check(await waitFor(async () => (await ev(`${PLAY_HOST}.classList.contains("flash")`)) === false, 2000), "the flash fades");

const point = await hotspotPoint();
check(point !== undefined, "a hotspot is clickable");
if (point) await ui.click(point.x, point.y);
check(await waitFor(async () => { const id = await shown(); return typeof id === "string" && id !== screenId; }, 10000), "a click on a hotspot opens its target");
log(`navigated to ${String(await shown())} "${String(await ev(`document.querySelector(".play-name")?.textContent`))}"`);
await ui.shot("target");

await ui.key("Backspace", "Backspace", 8);
check(await showing(screenId), "Backspace goes back");
await ui.key("ArrowLeft", "ArrowLeft", 37);
await sleep(500);
check((await shown()) === screenId, "← on the first screen stays");

await ui.key("Escape", "Escape", 27);
check(await waitFor(async () => !(await playing()), 5000), "Escape leaves Play");
check((await ev(CANVAS)) === before, "canvas keeps the live screen, selection and inspector");
check((await menuEnabled()) === true, "Play stays available after leaving");
check(await waitFor(async () => (await itemEnabled("export-screen")) === true, 5000), "Export is back after leaving");
check((await ev(`!!document.querySelector(".layout")?.closest("[inert]")`)) === false, "the window is live again");
await ui.shot("after");
log(failed ? `${failed} checks failed` : "all checks passed");
process.exit(failed ? 1 : 0);
