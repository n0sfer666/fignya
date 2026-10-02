import { clock, connect, setElectronVisible, sleep } from "./cdp";

const port = process.env.PORT ?? "9445";
const hiddenMs = Number(process.env.HIDDEN_MS ?? "25000");
const log = clock();
const ev = await connect(port);

const vis = async (): Promise<unknown> => ev("document.visibilityState");
const loaded = async (): Promise<unknown> =>
  ev(`(() => { const imgs = [...document.querySelectorAll(".screen img")]; return { loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length, total: imgs.length, eager: imgs.filter((i) => i.loading === "eager").length }; })()`);
const waitFor = async (check: () => Promise<boolean>, ms: number): Promise<boolean> => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await check()) return true;
    await sleep(250);
  }
  return false;
};

if (!(await waitFor(async () => (await ev(`document.querySelectorAll("ul.pages li").length`)) !== 0, 120000))) {
  log("import did not finish");
  process.exit(2);
}
log("imported");
const hide = async (): Promise<boolean> => {
  setElectronVisible(false);
  await sleep(300);
  return (await vis()) === "hidden";
};
if (!(await waitFor(hide, 10000))) {
  log(`window not hidden: ${String(await vis())}`);
  process.exit(3);
}
const picked = await ev(`(() => { const lis = [...document.querySelectorAll("ul.pages li")]; const count = (li) => Number(li.querySelector(".count")?.textContent ?? 0); const li = lis.reduce((a, b) => (count(b) > count(a) ? b : a)); li.click(); return count(li); })()`);
const expected = typeof picked === "number" ? picked : 0;
log(`hidden, opened page with ${expected} screens`);
const counts = async (): Promise<{ loaded: number; total: number; eager: number }> => {
  const s = await loaded();
  const n = (k: string): number => (typeof s === "object" && s !== null && k in s ? Number(Reflect.get(s, k)) : -1);
  return { loaded: n("loaded"), total: n("total"), eager: n("eager") };
};
await sleep(hiddenMs);
const hidden = await counts();
log(`still ${String(await vis())} after ${hiddenMs} ms: ${JSON.stringify(hidden)}`);
setElectronVisible(true);
await waitFor(async () => (await vis()) === "visible", 5000);
log(`revealed (${String(await vis())}): ${JSON.stringify(await counts())}`);
const full = await waitFor(async () => {
  const s = await counts();
  return s.total > 0 && s.loaded === s.total;
}, 120000);
log(`${full ? "all loaded" : "timeout"}: ${JSON.stringify(await counts())}`);
if (expected === 0 || hidden.total !== expected) process.exit(6);
if (!full) process.exit(4);
process.exit(hidden.loaded === hidden.total ? 0 : 5);
