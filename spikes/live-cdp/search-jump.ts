import { mkdirSync, writeFileSync } from "node:fs";
import { clock, evaluator, imported, isRec, session, setElectronVisible, sleep, waitFor, type Send } from "./cdp";

const port = process.env.PORT ?? "9445";
const tag = process.argv[2] ?? "run";
const dir = `${import.meta.dir}/out/search-${tag}`;
mkdirSync(dir, { recursive: true });
const log = clock();
const send = await session(port, 60000, 60000);
const ev = evaluator(send);
let failed = 0;

const close = (delta: unknown): boolean => typeof delta === "number" && delta >= 0 && delta < 0.5;

const check = (ok: boolean, what: string): void => {
  if (!ok) failed += 1;
  log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

const key = async (s: Send, k: string, code: string, vk: number, modifiers = 0): Promise<void> => {
  await s("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, modifiers });
  await s("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, modifiers });
};

const search = async (query: string): Promise<unknown> => {
  await key(send, "f", "KeyF", 70, 4);
  await sleep(400);
  await ev(`document.querySelector(".search input")?.select()`);
  await send("Input.insertText", { text: query });
  const typed = Date.now();
  const shown = await waitFor(async () => (await ev(`document.querySelectorAll(".search li, .search .empty").length`)) !== 0, 5000);
  if (!shown) log(`no results for ${query}: ${JSON.stringify(await ev(`({ open: !!document.querySelector(".search"), value: document.querySelector(".search input")?.value, focus: document.activeElement?.tagName, hasFocus: document.hasFocus() })`))}`);
  if (shown) log(`answered in ${Date.now() - typed} ms`);
  return ev(`[...document.querySelectorAll(".search li, .search .empty")].map((el) => el.textContent)`);
};

const settled = (screenId: string): Promise<boolean> =>
  waitFor(async () => (await ev(`document.querySelector(".screen.live")?.dataset.screenId === ${JSON.stringify(screenId)} && !!document.querySelector(".node-mark")`)) === true, 15000);

const state = (): Promise<unknown> =>
  ev(`(() => { const w = document.querySelector(".world"); const m = document.querySelector(".node-mark")?.getBoundingClientRect(); const box = w?.parentElement?.getBoundingClientRect(); return { page: document.querySelector("ul.pages li.active")?.firstChild?.textContent?.trim(), live: document.querySelector(".screen.live")?.dataset.screenId, zoom: w?.style.transform.match(/scale\\(([^)]+)\\)/)?.[1], mark: m && [m.x, m.y, m.width, m.height].map(Math.round), inView: !!(m && box && m.x >= box.x && m.right <= box.right && m.y >= box.y && m.bottom <= box.bottom) }; })()`);

const markDelta = (chain: string[]): Promise<unknown> =>
  ev(`(() => { let scope = document.querySelector(".screen.live > [data-screen]")?.shadowRoot; let el; for (const id of ${JSON.stringify(chain)}) { const next = scope?.querySelector('[data-id="' + CSS.escape(id) + '"]'); if (!next) return -2; el = next; scope = next; } const m = document.querySelector(".node-mark")?.getBoundingClientRect(); if (!el || !m) return -1; const r = el.getBoundingClientRect(); return Math.max(Math.abs(r.x - m.x), Math.abs(r.y - m.y), Math.abs(r.width - m.width), Math.abs(r.height - m.height)); })()`);

const shot = async (name: string): Promise<void> => {
  const result = await send("Page.captureScreenshot", { format: "png" });
  if (isRec(result) && typeof result.data === "string") writeFileSync(`${dir}/${name}.png`, Buffer.from(result.data, "base64"));
};

const pickNested = (): Promise<unknown> =>
  ev(`(() => { const root = document.querySelector(".screen.live > [data-screen]")?.shadowRoot; const texts = [...(root?.querySelectorAll('[data-kind="text"]') ?? [])].filter((t) => t.getBoundingClientRect().width > 0); const outer = (el) => { let found; for (let p = el.parentElement; p; p = p.parentElement) if (p.dataset.kind === "instance") found = p; return found; }; const own = texts.find((t) => !outer(t)); const inside = texts.find((t) => outer(t) && outer(t) !== t); return { own: own?.dataset.id, outer: inside && outer(inside).dataset.id, inner: inside?.dataset.id }; })()`);

if (!(await imported(ev))) {
  log("import did not finish");
  process.exit(2);
}
setElectronVisible(port, true);
await waitFor(async () => (await ev("document.visibilityState")) === "visible", 5000);
log(`imported, ${String(await ev("document.visibilityState"))}`);

log(`results: ${JSON.stringify(await search("2479-25954"))}`);
await key(send, "Enter", "Enter", 13);
check(await settled("2479:25954"), `2479-25954 → ${JSON.stringify(await state())}`);
await shot("a-screen");

const picked = await pickNested();
log(`picked ${JSON.stringify(picked)}`);
const own = isRec(picked) && typeof picked.own === "string" ? picked.own : undefined;
const outer = isRec(picked) && typeof picked.outer === "string" ? picked.outer : undefined;
const inner = isRec(picked) && typeof picked.inner === "string" ? picked.inner : undefined;

await ev(`[...document.querySelectorAll("ul.pages li")].find((li) => !li.classList.contains("active"))?.click()`);
await sleep(500);
log(`switched to page ${String(await ev(`document.querySelector("ul.pages li.active")?.firstChild?.textContent?.trim()`))}`);
if (own) {
  log(`results: ${JSON.stringify(await search(`https://www.figma.com/design/pQdiSdJI4To6uFJmYmFP0H/ROI-Navigator?node-id=${own.replace(":", "-")}&t=x`))}`);
  await key(send, "Enter", "Enter", 13);
  const ok = await settled("2479:25954");
  await sleep(300);
  const s = await state();
  const delta = await markDelta([own]);
  check(ok && isRec(s) && s.inView === true && close(delta), `link to ${own} from another page → ${JSON.stringify(s)}, delta ${String(delta)}`);
  await shot("b-nested");
  await ev(`(() => { const el = document.querySelector(".screen.live > [data-screen]")?.shadowRoot?.querySelector('[data-id="' + CSS.escape(${JSON.stringify(own)}) + '"]'); if (el instanceof HTMLElement) el.style.padding = "12px"; })()`);
  await sleep(300);
  const grown = await markDelta([own]);
  check(close(grown), `mark follows relayout of ${own} → delta ${String(grown)}`);
  await ev(`(() => { const el = document.querySelector(".screen.live > [data-screen]")?.shadowRoot?.querySelector('[data-id="' + CSS.escape(${JSON.stringify(own)}) + '"]'); if (el instanceof HTMLElement) el.style.padding = ""; })()`);
}
if (outer && inner) {
  const chain = `I${outer};${inner}`;
  log(`results: ${JSON.stringify(await search(chain))}`);
  await key(send, "Enter", "Enter", 13);
  await sleep(800);
  const s = await state();
  const delta = await markDelta([outer, inner]);
  check(isRec(s) && s.inView === true && close(delta), `${chain} → ${JSON.stringify(s)}, delta ${String(delta)}`);
  await shot("c-instance");
}

log(`results: ${JSON.stringify(await search("13160:88951"))}`);
await key(send, "Enter", "Enter", 13);
check(await settled("13160:88951"), `13160:88951 → ${JSON.stringify(await state())}`);
await shot("d-screen");

const empty = await search("9:99999999");
check(JSON.stringify(empty) === JSON.stringify(["Nothing found"]), `9:99999999 → ${JSON.stringify(empty)}`);
await key(send, "Escape", "Escape", 27);
await sleep(200);
const after = await ev(`({ search: !!document.querySelector(".search"), live: document.querySelector(".screen.live")?.dataset.screenId })`);
check(isRec(after) && after.search === false && after.live === "13160:88951", `Escape closes search, live DOM stays → ${JSON.stringify(after)}`);

await search("2479-25954");
setElectronVisible(port, false);
await sleep(800);
const away = await ev(`({ open: !!document.querySelector(".search"), hasFocus: document.hasFocus() })`);
setElectronVisible(port, true);
await waitFor(async () => (await ev("document.hasFocus()")) === true, 5000);
const back = await ev(`({ open: !!document.querySelector(".search"), value: document.querySelector(".search input")?.value, focus: document.activeElement?.tagName })`);
check(isRec(back) && back.open === true && back.value === "2479-25954", `window blur keeps search open → away ${JSON.stringify(away)}, back ${JSON.stringify(back)}`);
await key(send, "Escape", "Escape", 27);

log(failed === 0 ? "all checks passed" : `${failed} checks failed`);
process.exit(failed === 0 ? 0 : 7);
