import { clock, connect, isRec, setElectronVisible, shownAfterImport, sleep, waitFor } from "./cdp";

const port = process.env.PORT ?? "9445";
const [pageName = "03 screens", gapArg = "600"] = process.argv.slice(2);
const gap = Number(gapArg);
const log = clock();
const ev = await connect(port, 60000, 60000);
const shown = await shownAfterImport(ev, port, log);
if (shown !== 0) process.exit(shown);

const KEYS = {
  in: "24 using command down",
  plus: "24 using {command down, shift down}",
  out: "27 using command down",
  actual: "29 using command down",
} as const;
type Step = keyof typeof KEYS;
const PRESSES: Step[] = ["in", "in", "in", "out", "out", "out", "actual", "plus", "plus", "out", "actual"];

const press = (step: Step): void => {
  const r = Bun.spawnSync(["osascript", "-e", `tell application "System Events" to key code ${KEYS[step]}`]);
  if (r.exitCode !== 0) console.error(`osascript: ${r.stderr.toString().trim()}`);
};

await ev(`(() => {
  window.__kz = { keys: [], ipc: [], long: [] };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__kz.long.push(Math.round(e.duration)))).observe({ type: "longtask" });
  window.addEventListener("keydown", (e) => window.__kz.keys.push({ code: e.code, key: e.key, meta: e.metaKey, t: Math.round(performance.now()) }), true);
  window.fignya.onCanvasZoom((z) => window.__kz.ipc.push({ z, t: Math.round(performance.now()) }));
  return true;
})()`);

const opened = await ev(`(async () => {
  const li = [...document.querySelectorAll("ul.pages li")].find((l) => l.textContent.startsWith(${JSON.stringify(pageName)}));
  if (!li) return "no page";
  li.click();
  await new Promise((r) => setTimeout(r, 1500));
  return document.querySelectorAll(".world > .screen").length;
})()`);
log(`page ${pageName}: ${String(opened)} screens`);

const state = `(() => ({
  transform: document.querySelector(".world").style.transform,
  keys: window.__kz.keys.length,
  ipc: window.__kz.ipc.length,
  lag: window.__kz.ipc.length && window.__kz.keys.length ? window.__kz.ipc.at(-1).t - window.__kz.keys.at(-1).t : 0,
  long: window.__kz.long.splice(0).reduce((a, b) => Math.max(a, b), 0),
  focus: document.hasFocus(),
}))()`;

const frontmost = (): string =>
  Bun.spawnSync([
    "osascript",
    "-l",
    "JavaScript",
    "-e",
    'ObjC.import("AppKit"); const a = $.NSWorkspace.sharedWorkspace.frontmostApplication; a.localizedName.js + ":" + a.processIdentifier',
  ])
    .stdout.toString()
    .trim();

type State = { transform: string; keys: number; ipc: number; lag: number; long: number; focus: boolean };
const read = async (): Promise<State> => {
  const v = await ev(state);
  if (!isRec(v)) throw new Error("no state");
  return { transform: String(v.transform), keys: Number(v.keys), ipc: Number(v.ipc), lag: Number(v.lag), long: Number(v.long), focus: v.focus === true };
};

let failed = 0;
for (const step of PRESSES) {
  setElectronVisible(port, true);
  await waitFor(async () => (await read()).focus, 3000);
  const before = await read();
  press(step);
  await sleep(gap);
  const after = await read();
  const moved = after.transform !== before.transform;
  if (after.ipc === before.ipc) failed++;
  log(
    `${step}: front=${frontmost()} focus=${before.focus}->${after.focus} keydown=${after.keys - before.keys} ipc=${after.ipc - before.ipc} moved=${moved} lag=${after.lag}ms longtask=${after.long}ms ${after.transform}`,
  );
}
log(`ipc missing: ${failed}/${PRESSES.length}`);
log(`events: ${JSON.stringify(await ev("window.__kz"))}`);
process.exit(failed === 0 ? 0 : 5);
