import { clock, connect, shownAfterImport, sleep, waitFor } from "./cdp";
import { fitZoom, openLargestPage, thumbCounts } from "./page-thumbs";

const port = process.env.PORT ?? "9445";
const log = clock();
const ev = await connect(port);

const shown = await shownAfterImport(ev, port, log);
if (shown !== 0) process.exit(shown);
const expected = await openLargestPage(ev);
log(`opened page with ${expected} screens, zoom ${await fitZoom(ev)}`);
await sleep(1000);
log(`before zoom: ${JSON.stringify(await thumbCounts(ev))}`);

const target = await ev(
  `(() => { const frames = [...document.querySelectorAll(".screen")]; const target = frames[frames.length - 1]; const el = document.querySelector(".world")?.parentElement; if (!target || !el) return ""; const r = target.getBoundingClientRect(); const deltaY = -Math.log((el.clientWidth * 0.5) / r.width) / 0.01; el.dispatchEvent(new WheelEvent("wheel", { deltaY, ctrlKey: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); return target.dataset.screenId; })()`,
);
if (typeof target !== "string" || target === "") process.exit(6);
const started = performance.now();
log(`zoomed to ${target}, zoom ${await fitZoom(ev)}`);

type Visible = { n: number; base: number; sharp: number; loaded: number; total: number };
const visible = async (): Promise<Visible> => {
  const s = await ev(
    `(() => { const b = document.querySelector(".world").parentElement.getBoundingClientRect(); const all = [...document.querySelectorAll(".screen")]; const shown = (f) => { const i = f.querySelector("img"); return i.complete && i.naturalWidth > 0; }; const vis = all.filter((f) => { const r = f.getBoundingClientRect(); return r.right > b.left && r.left < b.right && r.bottom > b.top && r.top < b.bottom; }); return [vis.length, vis.filter(shown).length, vis.filter((f) => Number(f.dataset.tier ?? 0) > 0.5).length, all.filter(shown).length, all.length]; })()`,
  );
  const [n = -1, base = -1, sharp = -1, loaded = -1, total = -1] = Array.isArray(s) ? s.map(Number) : [];
  return { n, base, sharp, loaded, total };
};

const since = (): string => ((performance.now() - started) / 1000).toFixed(1);
let baseAt = "";
let last = await visible();
const sharp = await waitFor(async () => {
  last = await visible();
  if (!baseAt && last.n > 0 && last.base === last.n) {
    baseAt = since();
    log(`visible base after ${baseAt} s: ${JSON.stringify(last)}`);
  }
  return last.n > 0 && last.sharp === last.n;
}, 60000);
log(`${sharp ? `visible sharp after ${since()} s` : "timeout"}: ${JSON.stringify(last)}`);
process.exit(sharp ? 0 : 4);
