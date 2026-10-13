import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { clock, evaluator, imported, isRec, session, setElectronVisible, sleep, waitFor } from "./cdp";
import { connectMain } from "./main-cdp";
import { createUi, ROOT } from "./ui";

const port = process.env.PORT ?? "9445";
const inspect = process.env.INSPECT ?? "9446";
const tag = process.argv[2] ?? "run";
const screenId = process.argv[3] ?? "2479:25954";
const dir = `${import.meta.dir}/out/export-${tag}`;
const site = `${dir}/site`;
mkdirSync(dir, { recursive: true });
rmSync(site, { recursive: true, force: true });
const log = clock();
const send = await session(port, 60000, 60000);
const ev = evaluator(send);
const main = await connectMain(inspect);
const ui = createUi(send, ev, dir);
let failed = 0;

const check = (ok: boolean, what: string): void => {
  if (!ok) failed += 1;
  log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

const REQUIRE = `(globalThis.require ?? process.mainModule.require)`;

const ELECTRON = `${REQUIRE}("electron")`;

const menuEnabled = (): Promise<unknown> => main(`${ELECTRON}.Menu.getApplicationMenu()?.getMenuItemById("export-screen")?.enabled`);

const INHERITED = new Set(["color", "fontFamily", "fontSize", "fontWeight", "lineHeight"]);
const PROPS = ["display", "position", "color", "backgroundColor", "backgroundImage", "fontFamily", "fontSize", "fontWeight", "lineHeight", "borderRadius", "opacity", "boxShadow", "filter"];

const nodesScript = (rootExpr: string, zoomExpr: string): string => `(() => {
  const root = ${rootExpr};
  const first = root?.querySelector("[data-id]");
  if (!first) return undefined;
  const zoom = ${zoomExpr}, origin = first.getBoundingClientRect();
  const r2 = (v) => Math.round(v * 2) / 2;
  const clean = (v) => v.replace(/url\\("?[^")]*\\/([0-9a-f]+)(\\.[a-z]+)?"?\\)/g, "url($1)");
  return [...root.querySelectorAll("[data-id]")].map((el) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { id: el.dataset.id, kind: el.dataset.kind, box: [r.x - origin.x, r.y - origin.y, r.width, r.height].map((v) => r2(v / zoom)), style: Object.fromEntries(${JSON.stringify(PROPS)}.map((p) => [p, clean(cs[p])])) };
  });
})()`;

type Node = { id: string; kind: string; box: number[]; style: Record<string, string> };

const nodes = (value: unknown): Node[] => (Array.isArray(value) ? value.filter((n): n is Node => isRec(n) && typeof n.id === "string") : []);

const compare = (live: Node[], exported: Node[]): string[] => {
  const diffs: string[] = [];
  if (live.length !== exported.length) diffs.push(`node count ${live.length} vs ${exported.length}`);
  live.forEach((a, i) => {
    const b = exported[i];
    if (!b || a.id !== b.id) return void diffs.push(`#${i} id ${a.id} vs ${b?.id}`);
    const off = a.box.findIndex((v, k) => Math.abs(v - (b.box[k] ?? Number.NaN)) > 1);
    if (off >= 0) diffs.push(`${a.kind} box ${a.id} ${a.box} vs ${b.box}`);
    const props = a.kind === "text" ? PROPS : PROPS.filter((p) => !INHERITED.has(p));
    for (const p of props) if (a.style[p] !== b.style[p]) diffs.push(`${a.kind} ${p} ${a.id}: ${a.style[p]} vs ${b.style[p]}`);
  });
  return diffs;
};

if (!(await imported(ev))) {
  log("import did not finish");
  process.exit(2);
}
setElectronVisible(port, true);
await waitFor(async () => (await ev("document.visibilityState")) === "visible", 5000);
check((await menuEnabled()) === false, "export menu item disabled without a live screen");
check(await ui.openScreen(screenId), `search ${screenId} opens the screen`);
await ui.key("Escape", "Escape", 27);
check(await waitFor(async () => (await menuEnabled()) === true, 5000), "export menu item enabled with a live screen");

const rootId = await ev(`${ROOT}?.querySelector("[data-id]")?.dataset.id`);
await ev(`window.fignya.edit({ target: [${JSON.stringify(rootId)}], style: { opacity: 0.5 } })`);
check(await waitFor(async () => (await ev(`getComputedStyle(${ROOT}.querySelector("[data-id]")).opacity`)) === "0.5", 5000), "edit redraws the live screen");
await sleep(1500);
const live = nodes(await ev(nodesScript(ROOT, `Number(document.querySelector(".world")?.style.getPropertyValue("--zoom")) || 1`)));
log(`live nodes: ${live.length}`);

await main(`(() => {
  const e = ${ELECTRON};
  globalThis.__fignyaExported = false;
  e.dialog.showSaveDialog = async () => ({ canceled: false, filePath: ${JSON.stringify(site)} });
  e.shell.showItemInFolder = () => { globalThis.__fignyaExported = true; };
  e.Menu.getApplicationMenu().getMenuItemById("export-screen").click();
})()`);
check(await waitFor(async () => (await main("globalThis.__fignyaExported")) === true, 30000), "File → Export Screen writes the folder");

const html = existsSync(`${site}/index.html`) ? readFileSync(`${site}/index.html`, "utf8") : "";
const css = existsSync(`${site}/styles.css`) ? readFileSync(`${site}/styles.css`, "utf8") : "";
const images = existsSync(`${site}/images`) ? readdirSync(`${site}/images`) : [];
const fonts = existsSync(`${site}/fonts`) ? readdirSync(`${site}/fonts`) : [];
log(`html ${html.length} B, css ${css.length} B, ${images.length} images, ${fonts.length} fonts`);
check(html.length > 0 && css.length > 0, "index.html and styles.css written");
check(!/\sstyle="/.test(html), "no inline styles in index.html");
check(!(html + css).includes("fignya://"), "no fignya:// urls");
const refs = [...new Set([...(html + css).matchAll(/(images|fonts)\/[0-9a-f]+(\.[a-z0-9]+)?/g)].map((m) => m[0]))];
const missing = refs.filter((r) => !existsSync(`${site}/${r}`));
check(missing.length === 0, `all ${refs.length} referenced files exist${missing.length ? `: missing ${missing.slice(0, 5)}` : ""}`);
const unused = [...images.map((f) => `images/${f}`), ...fonts.map((f) => `fonts/${f}`)].filter((f) => !refs.includes(f));
check(unused.length === 0, `every written file is referenced${unused.length ? `: unused ${unused.slice(0, 5)}` : ""}`);

const [w, h] = live[0]?.box.slice(2) ?? [800, 600];
const exported = nodes(
  await main(`(async () => {
    const e = ${ELECTRON};
    const win = new e.BrowserWindow({ width: ${Math.min(Math.ceil(w ?? 800), 3000)}, height: ${Math.min(Math.ceil(h ?? 600), 3000)}, useContentSize: true, show: true });
    globalThis.__fignyaExportWindow = win;
    await win.loadFile(${JSON.stringify(`${site}/index.html`)});
    await win.webContents.executeJavaScript("document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 500)))");
    const png = await win.webContents.capturePage();
    ${REQUIRE}("node:fs").writeFileSync(${JSON.stringify(`${dir}/export.png`)}, png.toPNG());
    return win.webContents.executeJavaScript(${JSON.stringify(nodesScript(`document.querySelector("[data-screen]")`, "1"))});
  })()`),
);
const loadedFonts = await main(
  `globalThis.__fignyaExportWindow.webContents.executeJavaScript("[...document.fonts].map((f) => f.family + ' ' + f.weight + ' ' + f.status)")`,
);
log(`export fonts: ${JSON.stringify(loadedFonts)}`);
const faceStates = Array.isArray(loadedFonts) ? loadedFonts.filter((f): f is string => typeof f === "string") : [];
check(!faceStates.some((f) => f.endsWith("error")) && (fonts.length === 0 || faceStates.some((f) => f.endsWith(" loaded"))), "exported faces load from file://");
const diffs = compare(live, exported);
const kinds = new Map<string, { count: number; sample: string }>();
for (const d of diffs) {
  const key = d.split(" ").slice(0, 2).join(" ");
  const seen = kinds.get(key);
  kinds.set(key, { count: (seen?.count ?? 0) + 1, sample: seen?.sample ?? d });
}
for (const [key, { count, sample }] of kinds) log(`  ${count}× ${key} — ${sample}`);
check(diffs.length === 0, `exported page matches the live screen (${live.length} nodes, ${diffs.length} diffs)`);
check(exported[0]?.style.opacity === "0.5", "export carries the edit");
await ui.shot("live");
await main(`globalThis.__fignyaExportWindow.close()`);

const asFile = `${dir}/as-file`;
writeFileSync(asFile, "mine");
await main(`(() => {
  const e = ${ELECTRON};
  globalThis.__fignyaDialogs = 0;
  globalThis.__fignyaErrors = [];
  e.dialog.showSaveDialog = async () => {
    globalThis.__fignyaDialogs += 1;
    await new Promise((r) => setTimeout(r, 1000));
    return { canceled: false, filePath: ${JSON.stringify(asFile)} };
  };
  e.dialog.showErrorBox = (title, message) => globalThis.__fignyaErrors.push(title + ": " + message);
  const item = e.Menu.getApplicationMenu().getMenuItemById("export-screen");
  item.click();
  item.click();
})()`);
const errorsShown = async (): Promise<unknown[]> => {
  const value = await main("globalThis.__fignyaErrors");
  return Array.isArray(value) ? value : [];
};
check(await waitFor(async () => (await errorsShown()).length > 0, 15000), "export onto a file shows an error");
await sleep(1500);
log(`errors: ${JSON.stringify(await errorsShown())}`);
check((await main("globalThis.__fignyaDialogs")) === 1, "a second ⌘E during an export opens no second dialog");
check((await errorsShown()).length === 1 && readFileSync(asFile, "utf8") === "mine", "the file in the way is left as is");
log(failed ? `${failed} checks failed` : "all checks passed");
process.exit(failed ? 1 : 0);
