import { mkdirSync, writeFileSync } from "node:fs";
import { clock, evaluator, imported, isRec, session, setElectronVisible, sleep, waitFor } from "./cdp";

const port = process.env.PORT ?? "9445";
const tag = process.argv[2] ?? "run";
const screenId = process.argv[3] ?? "2479:25954";
const dir = `${import.meta.dir}/out/select-${tag}`;
mkdirSync(dir, { recursive: true });
const log = clock();
const send = await session(port, 60000, 60000);
const ev = evaluator(send);
let failed = 0;

const check = (ok: boolean, what: string): void => {
  if (!ok) failed += 1;
  log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

const ROOT = `document.querySelector(".screen.live > [data-screen]")?.shadowRoot`;

const shot = async (name: string): Promise<void> => {
  const result = await send("Page.captureScreenshot", { format: "png" });
  if (isRec(result) && typeof result.data === "string") writeFileSync(`${dir}/${name}.png`, Buffer.from(result.data, "base64"));
};

const key = async (k: string, code: string, vk: number, modifiers = 0): Promise<void> => {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, modifiers });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, modifiers });
};

const mouse = async (type: string, x: number, y: number, modifiers = 0, clickCount = 1): Promise<void> => {
  const pressed = type === "mouseMoved" ? {} : { button: "left", clickCount };
  await send("Input.dispatchMouseEvent", { type, x, y, modifiers, ...pressed });
};

const click = async (x: number, y: number, modifiers = 0, clickCount = 1): Promise<void> => {
  await mouse("mousePressed", x, y, modifiers, clickCount);
  await mouse("mouseReleased", x, y, modifiers, clickCount);
};

const target = (): Promise<unknown> =>
  ev(`(() => {
    const root = ${ROOT};
    const host = root?.host;
    const bench = document.querySelector(".workspace")?.getBoundingClientRect();
    const chainOf = (el) => { const c = []; for (let at = el.closest("[data-id]"); at; at = at.parentElement?.closest("[data-id]")) c.unshift(at); return c; };
    let first;
    for (const el of root?.querySelectorAll('[data-kind="text"]') ?? []) {
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const chain = chainOf(el);
      if (chain.length < 4 || !bench || x < bench.left + 8 || x > bench.right - 8 || y < bench.top + 60 || y > bench.bottom - 8) continue;
      if (document.elementFromPoint(x, y) !== host || root.elementFromPoint(x, y)?.closest("[data-id]") !== el) continue;
      const found = { x, y, chain: chain.map((c) => c.dataset.id), kinds: chain.map((c) => c.dataset.kind) };
      if (found.kinds.indexOf("instance") > 1) return found;
      first ??= found;
    }
    return first;
  })()`);

const outlineOf = (className: string, depth: number, chain: string[]): Promise<unknown> =>
  ev(`(() => {
    let el = ${ROOT}?.querySelector('[data-id="' + CSS.escape(${JSON.stringify(chain[0])}) + '"]');
    for (const id of ${JSON.stringify(chain.slice(1, depth + 1))}) el = el?.querySelector(':scope > [data-id="' + CSS.escape(id) + '"]');
    const box = document.querySelectorAll(".${className}");
    if (!el || box.length !== 1) return { count: box.length };
    const r = el.getBoundingClientRect(), m = box[0].getBoundingClientRect();
    return { count: 1, delta: Math.max(Math.abs(r.x - m.x), Math.abs(r.y - m.y), Math.abs(r.width - m.width), Math.abs(r.height - m.height)), width: el.style.width };
  })()`);

const inspector = (): Promise<unknown> =>
  ev(`Object.fromEntries([...document.querySelectorAll(".inspector section")].map((s) => [s.querySelector("h2")?.textContent, Object.fromEntries([...s.querySelectorAll("dt")].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]))]))`);

const rowOf = (shown: unknown, section: string, row: string): unknown => {
  const rows = isRec(shown) ? shown[section] : undefined;
  return isRec(rows) ? rows[row] : undefined;
};

const selects = async (what: string, depth: number, chain: string[]): Promise<void> => {
  await sleep(250);
  const box = await outlineOf("node-selection", depth, chain);
  const shown = await inspector();
  const id = rowOf(shown, "Layer", "id");
  const width = rowOf(shown, "Size", "width");
  const fits = isRec(box) && box.count === 1 && typeof box.delta === "number" && box.delta < 0.5;
  const same = id === chain[depth] && (!isRec(box) || !box.width || width === box.width);
  check(fits && same, `${what} → ${chain[depth]} (depth ${depth}): box ${JSON.stringify(box)}, inspector id ${String(id)} width ${String(width)}`);
};

if (!(await imported(ev))) {
  log("import did not finish");
  process.exit(2);
}
setElectronVisible(port, true);
await waitFor(async () => (await ev("document.visibilityState")) === "visible", 5000);

await key("f", "KeyF", 70, 4);
await sleep(400);
await send("Input.insertText", { text: screenId });
await waitFor(async () => (await ev(`document.querySelectorAll(".search li").length`)) !== 0, 5000);
await key("Enter", "Enter", 13);
const live = await waitFor(async () => (await ev(`document.querySelector(".screen.live")?.dataset.screenId === ${JSON.stringify(screenId)} && !!document.querySelector(".node-selection")`)) === true, 15000);
check(live, `search ${screenId} opens the screen and selects its root: ${JSON.stringify(rowOf(await inspector(), "Layer", "id"))}`);
await key("Escape", "Escape", 27);
await sleep(200);
check((await ev(`!document.querySelector(".node-selection") && !!document.querySelector(".screen.live") && !!document.querySelector(".inspector .empty")`)) === true, "Esc clears the selection, the screen stays live");

const picked = await target();
log(`target ${JSON.stringify(picked)}`);
if (!isRec(picked) || typeof picked.x !== "number" || typeof picked.y !== "number" || !Array.isArray(picked.chain)) {
  log("no visible nested text on the screen");
  process.exit(3);
}
const { x, y } = picked;
const chain = picked.chain.filter((id): id is string => typeof id === "string");
const last = chain.length - 1;

await mouse("mouseMoved", x, y);
await sleep(200);
const hovered = await outlineOf("node-hover", 1, chain);
check(isRec(hovered) && hovered.count === 1 && typeof hovered.delta === "number" && hovered.delta < 0.5, `hover outlines the top level ${JSON.stringify(hovered)}`);

await click(x, y);
await selects("click", 1, chain);
await shot("a-click");
await sleep(600);
await click(x, y);
await selects("second click keeps the level", 1, chain);
await sleep(600);
await click(x, y);
await click(x, y, 0, 2);
await selects("double click", 2, chain);
check((await ev(`(${ROOT}?.getSelection?.() ?? document.getSelection())?.toString() ?? ""`)) === "", "double click does not select text");
await sleep(600);
await click(x, y, 4);
await selects("⌘+click", last, chain);
check(rowOf(await inspector(), "Typography", "font-size") !== undefined, "inspector shows typography of the text");
await shot("b-deep");

const instanceDepth = Array.isArray(picked.kinds) ? picked.kinds.indexOf("instance") : -1;
if (instanceDepth > 0) {
  await key("Escape", "Escape", 27);
  await sleep(600);
  await click(x, y);
  for (let depth = 1; depth < instanceDepth; depth++) {
    await sleep(600);
    await click(x, y);
    await click(x, y, 0, 2);
  }
  await selects("double clicks down to the instance", instanceDepth, chain);
  log(`component ${JSON.stringify(rowOf(await inspector(), "Layer", "component"))}`);
  check(typeof rowOf(await inspector(), "Layer", "component") === "string", "inspector names the instance component");
}

const center = await ev(`(() => { const r = document.querySelector(".workspace").getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
if (Array.isArray(center) && typeof center[0] === "number" && typeof center[1] === "number") {
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: center[0], y: center[1], deltaX: 0, deltaY: -60, modifiers: 2 });
  await sleep(300);
  const depth = instanceDepth > 0 ? instanceDepth : last;
  const zoomed = await outlineOf("node-selection", depth, chain);
  check(isRec(zoomed) && typeof zoomed.delta === "number" && zoomed.delta < 0.5, `selection follows zoom ${JSON.stringify(zoomed)}`);
  await shot("c-zoomed");
}

await key("Escape", "Escape", 27);
await sleep(200);
check((await ev(`!document.querySelector(".node-selection") && !!document.querySelector(".screen.live")`)) === true, "first Esc clears the selection");
await key("Escape", "Escape", 27);
await sleep(200);
check((await ev(`!document.querySelector(".screen.live")`)) === true, "second Esc closes the live screen");

log(failed === 0 ? "all checks passed" : `${failed} checks failed`);
process.exit(failed === 0 ? 0 : 7);
