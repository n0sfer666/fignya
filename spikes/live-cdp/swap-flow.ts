import { mkdirSync, writeFileSync } from "node:fs";
import { clock, evaluator, imported, isRec, session, setElectronVisible, sleep, waitFor } from "./cdp";
import { createUi, META } from "./ui";

const ALT = 1;
const LIMIT = 300;
const port = process.env.PORT ?? "9445";
const tag = process.argv[2] ?? "run";
const screenId = process.argv[3] ?? "12645:34121";
const dir = `${import.meta.dir}/out/swap-${tag}`;
mkdirSync(dir, { recursive: true });
const log = clock();
const send = await session(port, 60000, 60000);
const ev = evaluator(send);
const ui = createUi(send, ev, dir);
let failed = 0;

const check = (ok: boolean, what: string): void => {
  if (!ok) failed += 1;
  log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

const PLAY_HOST = `document.querySelector(".play-stage > [data-screen]")`;
const shown = (): Promise<unknown> => ev(`${PLAY_HOST}?.dataset.screen`);
const move = (x: number, y: number): Promise<unknown> => send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
const num = (v: unknown): number => (typeof v === "number" ? v : Number.NaN);

const crop = async (name: string): Promise<void> => {
  const r = await ev(`(() => { const { c } = window.__probe; const b = c.parent.children[c.idx].getBoundingClientRect(); return { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 }; })()`);
  if (!isRec(r)) return;
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: num(r.x), y: num(r.y), width: num(r.width), height: num(r.height), scale: 1 } });
  if (isRec(shot) && typeof shot.data === "string") writeFileSync(`${dir}/${name}.png`, Buffer.from(shot.data, "base64"));
};

const label = (): Promise<unknown> => ev(`(() => { const { c } = window.__probe; const el = c.parent.children[c.idx]; return el.dataset.id + " " + el.innerText.replace(/\\s+/g, " ").slice(0, 40); })()`);

const OUTER = `[...${PLAY_HOST}.shadowRoot.querySelectorAll('[data-kind="instance"]')].filter((el) => !el.parentElement.closest('[data-kind="instance"]'))`;

const collect = `(() => {
  const root = ${PLAY_HOST}.shadowRoot;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    return r.width > 8 && r.height > 8 && y > 48 && y < innerHeight - 8 && x > 8 && x < innerWidth - 8 && el.contains(root.elementFromPoint(x, y));
  };
  window.__cands = ${OUTER}.filter(visible).slice(0, ${LIMIT}).map((el) => ({ parent: el.parentElement, idx: [...el.parentElement.children].indexOf(el) }));
  window.__times = [];
  addEventListener("pointerover", () => (window.__t0 = performance.now()), true);
  addEventListener("pointerover", () => window.__times.push(performance.now() - window.__t0));
  return window.__cands.length;
})()`;

const probe = (i: number): string => `(() => {
  const c = window.__cands[${i}];
  const el = c.parent.children[c.idx];
  const r = el.getBoundingClientRect();
  window.__probe = { el, c, html: el.innerHTML, times: window.__times.length };
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`;

const after = `(() => {
  const { el, c, html, times } = window.__probe;
  const now = c.parent.children[c.idx];
  return { swapped: !el.isConnected, changed: now.innerHTML !== html, ms: window.__times.slice(times) };
})()`;

if (!(await imported(ev))) {
  log("import did not finish");
  process.exit(2);
}
setElectronVisible(port, true);
await waitFor(async () => (await ev("document.visibilityState")) === "visible", 5000);
check(await ui.openScreen(screenId), `search ${screenId} opens the screen`);
await ui.key("Enter", "Enter", 13, ALT | META);
check(await waitFor(async () => (await shown()) === screenId, 15000), "⌥⌘↩ plays the screen");
log(`playing "${String(await ev(`document.querySelector(".play-name")?.textContent`))}"`);
const header = await ev(`(() => { const r = document.querySelector(".play-header").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
const away = isRec(header) ? { x: num(header.x), y: num(header.y) } : { x: 10, y: 10 };
await move(away.x, away.y);
const count = num(await ev(collect));
log(`outer instances in view: ${count}`);

let hovered = 0;
let differs = 0;
let restored = 0;
let sticky = 0;
const swapMs: number[] = [];
for (let i = 0; i < count; i++) {
  const at = await ev(probe(i));
  if (!isRec(at)) continue;
  if (hovered === 0) await crop("hover-before");
  await move(num(at.x), num(at.y));
  const over = await ev(after);
  if (!isRec(over) || over.swapped !== true) {
    await move(away.x, away.y);
    continue;
  }
  hovered += 1;
  if (over.changed === true) differs += 1;
  if (Array.isArray(over.ms)) swapMs.push(...over.ms.map(num));
  if (hovered === 1) {
    await crop("hover-on");
    log(`first hover swap: ${String(await label())}`);
  }
  await ev(`window.__probe.el = window.__probe.c.parent.children[window.__probe.c.idx]`);
  await move(away.x, away.y);
  const back = await ev(after);
  if (isRec(back) && back.changed === false) restored += 1;
  else sticky += 1;
}
const sorted = swapMs.filter(Number.isFinite).sort((a, b) => a - b);
log(`hover swaps: ${hovered}, content changed: ${differs}, back on leave: ${restored}, kept after leave: ${sticky}`);
log(`swap handler ms: median ${sorted[Math.floor(sorted.length / 2)]?.toFixed(1)}, max ${sorted.at(-1)?.toFixed(1)}`);
check(hovered > 0 && differs === hovered, "hover swaps a variant and changes its content");
check(restored > 0, "the variant goes back once the pointer leaves");
check((sorted.at(-1) ?? Infinity) < 50, "a swap takes under 50 ms");

const hotspots = num(await ev(`${PLAY_HOST}.shadowRoot.querySelectorAll("[data-hotspot]").length`));
log(`hotspots: ${hotspots}`);
let clicked = false;
for (let i = 0; i < hotspots && !clicked; i++) {
  const at = await ev(`(() => {
    const root = ${PLAY_HOST}.shadowRoot;
    const el = root.querySelectorAll("[data-hotspot]")[${i}];
    const r = el.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    return r.width < 4 || r.height < 4 || y < 48 || y > innerHeight - 8 || !el.contains(root.elementFromPoint(x, y)) ? undefined : { x, y };
  })()`);
  if (!isRec(at)) continue;
  await move(num(at.x), num(at.y));
  await ev(`(() => {
    let top = ${PLAY_HOST}.shadowRoot.elementFromPoint(${num(at.x)}, ${num(at.y)});
    for (let up = top; up; up = up.parentElement) if (up.dataset.kind === "instance") top = up;
    window.__probe = { el: top, c: { parent: top.parentElement, idx: [...top.parentElement.children].indexOf(top) }, html: top.innerHTML, times: window.__times.length };
  })()`);
  await crop("click-before");
  await ui.click(num(at.x), num(at.y));
  await sleep(300);
  if ((await shown()) !== screenId) {
    await ui.key("Backspace", "Backspace", 8);
    await waitFor(async () => (await shown()) === screenId, 10000);
    continue;
  }
  const out = await ev(after);
  clicked = isRec(out) && out.swapped === true && out.changed === true;
  if (clicked) {
    await crop("click-after");
    log(`click swap: ${String(await label())}`);
  }
}
check(clicked, "a click swaps a variant without leaving the screen");

await ui.key("Escape", "Escape", 27);
check(await waitFor(async () => (await ev(`!!document.querySelector(".play")`)) === false, 5000), "Escape leaves Play");
log(failed ? `${failed} checks failed` : "all checks passed");
process.exit(failed ? 1 : 0);
