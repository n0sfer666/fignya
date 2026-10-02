import { clock, connect, imported, setElectronVisible, sleep, waitFor } from "./cdp";
import { fitZoom, openLargestPage, thumbCounts, visibility, type ThumbCounts } from "./page-thumbs";

const port = process.env.PORT ?? "9445";
const log = clock();
const ev = await connect(port);

const vis = (): Promise<unknown> => visibility(ev);
const counts = (): Promise<ThumbCounts> => thumbCounts(ev);

if (!(await imported(ev))) {
  log("import did not finish");
  process.exit(2);
}
log("imported");
setElectronVisible(port, true);
if (!(await waitFor(async () => (await vis()) === "visible", 10000))) {
  log(`window not visible: ${String(await vis())}`);
  process.exit(3);
}

const expected = await openLargestPage(ev);
log(`opened page with ${expected} screens, zoom ${await fitZoom(ev)}`);
await sleep(1000);
const early = await counts();
log(`after 1 s: ${JSON.stringify(early)}`);
const started = performance.now();
let last = early;
let mark = 0;
let hiddenSeen = false;
const full = await waitFor(async () => {
  last = await counts();
  hiddenSeen ||= (await vis()) !== "visible";
  const at = Math.floor((performance.now() - started) / 5000);
  if (at > mark) {
    mark = at;
    log(`loaded ${last.loaded}/${last.total}`);
  }
  return last.total > 0 && last.loaded === last.total;
}, 180000);
const seconds = (performance.now() - started) / 1000 + 1;
log(`${full ? "all loaded" : "timeout"}: ${JSON.stringify(last)}, ${(last.loaded / seconds).toFixed(1)} thumbs/s`);
if (expected === 0 || early.total !== expected) process.exit(6);
if (!full) process.exit(4);
process.exit(early.lazy === early.total && !hiddenSeen ? 0 : 5);
