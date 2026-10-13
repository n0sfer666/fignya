import { clock, connect, imported, setElectronVisible, sleep, waitFor } from "./cdp";
import { openLargestPage, thumbCounts, visibility, type ThumbCounts } from "./page-thumbs";

const port = process.env.PORT ?? "9445";
const hiddenMs = Number(process.env.HIDDEN_MS ?? "25000");
const log = clock();
const ev = await connect(port);

const vis = (): Promise<unknown> => visibility(ev);
const counts = (): Promise<ThumbCounts> => thumbCounts(ev);
if (!(await imported(ev))) {
  log("import did not finish");
  process.exit(2);
}
log("imported");
const hide = async (): Promise<boolean> => {
  setElectronVisible(port, false);
  await sleep(300);
  return (await vis()) === "hidden";
};
if (!(await waitFor(hide, 10000))) {
  log(`window not hidden: ${String(await vis())}`);
  process.exit(3);
}
const expected = await openLargestPage(ev);
log(`hidden, opened page with ${expected} screens`);
await sleep(hiddenMs);
const hidden = await counts();
log(`still ${String(await vis())} after ${hiddenMs} ms: ${JSON.stringify(hidden)}`);
setElectronVisible(port, true);
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
