import { mkdirSync, writeFileSync } from "node:fs";
import { clock, evaluator, imported, isRec, session, setElectronVisible, sleep, waitFor } from "./cdp";

const port = process.env.PORT ?? "9445";
const [tag, ...ids] = process.argv.slice(2);
if (!tag || ids.length === 0) throw new Error("usage: shots.ts <tag> <screen id>…");
const dir = `${import.meta.dir}/out/shots-${tag}`;
mkdirSync(dir, { recursive: true });
const log = clock();
const send = await session(port, 60000, 60000);
const ev = evaluator(send);

if (!(await imported(ev))) {
  log("import did not finish");
  process.exit(2);
}
setElectronVisible(true);
await waitFor(async () => (await ev("document.visibilityState")) === "visible", 5000);
log(`imported, ${String(await ev("document.visibilityState"))}`);

const openScreen = (id: string): string => `(async () => {
  const frameOf = () => [...document.querySelectorAll(".world > .screen")].find((f) => f.dataset.screenId === ${JSON.stringify(id)});
  for (const li of document.querySelectorAll("ul.pages li")) {
    if (frameOf()) break;
    li.click();
    await new Promise((r) => setTimeout(r, 400));
  }
  const frame = frameOf();
  if (!frame) return "no page";
  const index = [...frame.parentElement.children].indexOf(frame);
  const li = document.querySelectorAll("ul.screens li")[index];
  if (!li) return "no list item";
  li.click();
  return "ok";
})()`;

const settle = (id: string): string => `(async () => {
  const live = document.querySelector(".world > .screen.live");
  if (live?.dataset.screenId !== ${JSON.stringify(id)}) return false;
  const host = live.querySelector("[data-screen]");
  if (!host?.shadowRoot?.childElementCount) return false;
  const within = (p) => Promise.race([p, new Promise((r) => setTimeout(r, 5000))]);
  await within(document.fonts.ready);
  await within(Promise.all([...host.shadowRoot.querySelectorAll("img")].map((i) => i.decode().catch(() => undefined))));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return true;
})()`;

const measure = `(() => {
  const host = document.querySelector(".world > .screen.live [data-screen]");
  const hr = host.getBoundingClientRect();
  const seen = new Map();
  const rects = {};
  const r2 = (v) => Math.round(v * 100) / 100;
  for (const el of host.shadowRoot.querySelectorAll("[data-id]")) {
    const n = (seen.get(el.dataset.id) ?? 0) + 1;
    seen.set(el.dataset.id, n);
    const r = el.getBoundingClientRect();
    rects[el.dataset.id + "#" + n] = [r2(r.x - hr.x), r2(r.y - hr.y), r2(r.width), r2(r.height)];
  }
  return { clip: { x: hr.x, y: hr.y, width: hr.width, height: hr.height, scale: 1 }, rects, visibility: document.visibilityState };
})()`;

type Shot = { ok: boolean; text: string };
const fail = (text: string): Shot => ({ ok: false, text });

const shoot = async (id: string): Promise<Shot> => {
  const opened = await ev(openScreen(id));
  if (opened !== "ok") return fail(String(opened));
  if (!(await waitFor(async () => (await ev(settle(id))) === true, 30000))) return fail("not settled");
  await sleep(500);
  const m = await ev(measure);
  if (!isRec(m) || !isRec(m.clip) || !isRec(m.rects)) return fail("measure failed");
  const shot = await send("Page.captureScreenshot", { format: "png", clip: m.clip });
  if (!isRec(shot) || typeof shot.data !== "string") return fail("no screenshot data");
  const file = id.replace(":", "-");
  writeFileSync(`${dir}/${file}.png`, Buffer.from(shot.data, "base64"));
  writeFileSync(`${dir}/${file}.json`, JSON.stringify(m));
  return { ok: true, text: `${Object.keys(m.rects).length} nodes, ${String(m.visibility)}` };
};

let failed = 0;
for (const id of ids) {
  const shot = await shoot(id).catch((error: unknown) => fail(`error ${String(error)}`));
  if (!shot.ok) failed++;
  log(`${id}: ${shot.text}`);
}
process.exit(failed === 0 ? 0 : 7);
