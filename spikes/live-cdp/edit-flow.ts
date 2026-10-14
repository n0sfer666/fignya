import { mkdirSync } from "node:fs";
import { clock, evaluator, imported, isRec, session, setElectronVisible, sleep, waitFor } from "./cdp";
import { createUi, META, ROOT, SHIFT } from "./ui";

const port = process.env.PORT ?? "9445";
const tag = process.argv[2] ?? "run";
const screenId = process.argv[3] ?? "2479:25954";
const dir = `${import.meta.dir}/out/edit-${tag}`;
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

const selectedStyle = (prop: string): Promise<unknown> =>
  ev(`(() => {
    const box = document.querySelector(".node-selection")?.getBoundingClientRect();
    const id = [...document.querySelectorAll(".inspector dt")].find((d) => d.textContent === "id")?.nextElementSibling?.textContent;
    const near = (r) => Math.abs(r.x - box.x) + Math.abs(r.y - box.y) + Math.abs(r.width - box.width) + Math.abs(r.height - box.height) < 1;
    const el = box && [...(${ROOT}?.querySelectorAll("[data-id]") ?? [])].find((e) => e.dataset.id === id && near(e.getBoundingClientRect()));
    return el && (${JSON.stringify(prop)} === "text" ? el.textContent : getComputedStyle(el)[${JSON.stringify(prop)}]);
  })()`);

const settles = (what: () => Promise<unknown>, want: unknown): Promise<boolean> => waitFor(async () => (await what()) === want, 5000);

const nestedText = (): Promise<unknown> =>
  ev(`(() => {
    const root = ${ROOT}, host = root?.host, bench = document.querySelector(".workspace")?.getBoundingClientRect();
    for (const el of root?.querySelectorAll('[data-kind="text"]') ?? []) {
      const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
      const inInstance = !!el.parentElement?.closest('[data-kind="instance"]');
      if (!inInstance || !bench || x < bench.left + 8 || x > bench.right - 8 || y < bench.top + 60 || y > bench.bottom - 8) continue;
      if (document.elementFromPoint(x, y) === host && root.elementFromPoint(x, y)?.closest("[data-id]") === el) return { x, y, id: el.dataset.id };
    }
  })()`);

if (!(await imported(ev))) {
  log("import did not finish");
  process.exit(2);
}
setElectronVisible(port, true);
await waitFor(async () => (await ev("document.visibilityState")) === "visible", 5000);
check(await ui.openScreen(screenId), `search ${screenId} opens the screen`);
await ui.key("Escape", "Escape", 27);
await sleep(200);

const picked = await nestedText();
log(`text ${JSON.stringify(picked)}`);
if (!isRec(picked) || typeof picked.x !== "number" || typeof picked.y !== "number") {
  log("no visible text inside an instance");
  process.exit(3);
}
await ui.click(picked.x, picked.y, META);
await sleep(300);
const id = await ui.row("Layer", "id");
const size = await ui.row("Typography", "font-size");
const text = await ui.row("Layer", "text");
log(`selected ${String(id)} font-size ${String(size)} text ${JSON.stringify(text)}`);
const bigger = `${Number.parseFloat(String(size)) + 10}px`;

check(await ui.type("font-size", bigger), "font-size is an input");
check(await settles(() => selectedStyle("fontSize"), bigger), `font-size ${bigger} shows in the live screen ${String(await selectedStyle("fontSize"))}`);
check((await ui.row("Typography", "font-size")) === bigger && (await ui.row("Layer", "id")) === id, "inspector keeps the layer and shows the new font-size");
const twins = (): Promise<unknown> =>
  ev(`[...(${ROOT}?.querySelectorAll('[data-id="${String(id)}"]') ?? [])].map((e) => getComputedStyle(e).fontSize)`);
const sizes = await twins();
log(`same layer in all instances: ${JSON.stringify(sizes)}`);
check(Array.isArray(sizes) && sizes.filter((v) => v === bigger).length === 1, "other instances of the component keep their font-size");
await ui.shot("a-font-size");

check(await ui.type("text", "fignya edit"), "text is a textarea");
check(await settles(() => selectedStyle("text"), "fignya edit"), "new text shows in the live screen");

check(await ui.type("font-size", "abc"), "typed broken font-size");
await sleep(300);
check((await ev(`!!document.querySelector(".inspector .field.invalid")`)) === true && (await selectedStyle("fontSize")) === bigger, "broken input is flagged and not applied");
await ui.key("Escape", "Escape", 27);
await sleep(200);
check((await ev(`!document.querySelector(".inspector .field.invalid") && !!document.querySelector(".node-selection")`)) === true && (await ui.row("Typography", "font-size")) === bigger, "Esc reverts the field and keeps the selection");

await ev(`document.activeElement?.blur()`);
await ui.key("z", "KeyZ", 90, META);
check(await settles(() => selectedStyle("text"), text), `⌘Z restores the text ${String(await selectedStyle("text"))}`);
await ui.key("z", "KeyZ", 90, META);
check(await settles(() => selectedStyle("fontSize"), size), `⌘Z restores font-size ${String(await selectedStyle("fontSize"))}`);
await ui.key("z", "KeyZ", 90, META | SHIFT);
check(await settles(() => selectedStyle("fontSize"), bigger), "⌘⇧Z redoes font-size");
await ui.shot("b-redo");

await ui.key("Escape", "Escape", 27);
await ui.key("Escape", "Escape", 27);
const thumb = () => ev(`(() => { const img = document.querySelector('.screen[data-screen-id="${screenId}"] img'); return img && img.complete && img.naturalWidth > 0 && /[?&]r=\\d/.test(img.src); })()`);
check(await waitFor(async () => (await thumb()) === true, 20000), "closed screen shows a thumbnail of the edited revision");
await ui.shot("c-thumb");
check(await ui.openScreen(screenId), "reopened the screen");
await ui.click(picked.x, picked.y, META);
await sleep(300);
check((await ui.row("Typography", "font-size")) === bigger, "reopened screen keeps the edit");

const rect = (): Promise<unknown> => ev(`(() => { const r = document.querySelector(".node-selection")?.getBoundingClientRect(); return r && [r.x, r.y, r.width]; })()`);
const before = await rect();
const width = Number.parseFloat(String(await ui.row("Size", "width")));
check(await ui.type("width", String(width + 20)), "width is an input");
await waitFor(async () => (await ui.row("Size", "width")) === `${width + 20}px`, 5000);
const after = await rect();
log(`box before ${JSON.stringify(before)} after ${JSON.stringify(after)}`);
const kept = Array.isArray(before) && Array.isArray(after) && Math.abs(before[0] - after[0]) < 0.5 && Math.abs(before[1] - after[1]) < 0.5 && after[2] > before[2];
check(kept, "width inside an instance grows the box in place");
const focused = (): Promise<unknown> => ev(`document.activeElement?.closest(".inspector dd")?.previousElementSibling?.textContent`);
check((await focused()) === "width", `the field keeps focus after the live screen redraws (${String(await focused())})`);
await ui.key("z", "KeyZ", 90, META);
check(await waitFor(async () => (await ui.row("Size", "width")) === `${width}px`, 5000), "⌘Z right after Enter, still in the field, undoes the edit");
await ui.key("z", "KeyZ", 90, META | SHIFT);
check(await waitFor(async () => (await ui.row("Size", "width")) === `${width + 20}px`, 5000), "⌘⇧Z in the same field redoes it");
check((await ev(`document.activeElement?.value`)) === `${width + 20}px`, "the field shows the redone value");

const height = await ui.row("Size", "height");
check(await ui.focus("height"), "height is an input");
await send("Input.insertText", { text: "999" });
await ui.key("z", "KeyZ", 90, META);
await sleep(500);
const typed = await ev(`document.activeElement?.value`);
check(typed === height && (await ui.row("Size", "width")) === `${width + 20}px`, `⌘Z in a field undoes the typing, not the document (${String(typed)})`);

const taller = `${Number.parseFloat(String(height)) + 10}px`;
const empty = await ev(`(() => {
  const r = document.querySelector(".workspace").getBoundingClientRect();
  for (let y = r.top + 70; y < r.bottom - 10; y += 20)
    for (let x = r.left + 10; x < r.right - 10; x += 20)
      if (!document.elementFromPoint(x, y)?.closest(".screen, .inspector, .search")) return { x, y };
})()`);
check(isRec(empty) && typeof empty.x === "number" && typeof empty.y === "number", "found empty canvas");
await ui.focus("height");
await send("Input.insertText", { text: taller });
if (isRec(empty) && typeof empty.x === "number" && typeof empty.y === "number") await ui.click(empty.x, empty.y);
await sleep(1500);
check((await ev(`!document.querySelector(".node-selection") && !!document.querySelector(".inspector .empty")`)) === true, "a click away commits the field and the redraw keeps the new (empty) selection");
await ui.click(picked.x, picked.y, META);
await sleep(300);
check((await ui.row("Size", "height")) === taller, "the edit from blur landed on the old layer");
await ui.shot("d-blur");

log(failed === 0 ? "all checks passed" : `${failed} checks failed`);
process.exit(failed === 0 ? 0 : 7);
