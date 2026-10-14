import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { clock, evaluator, imported, isRec, session, setElectronVisible, sleep, waitFor } from "./cdp";
import { connectMain } from "./main-cdp";
import { createUi, ROOT } from "./ui";

const port = process.env.PORT ?? "9445";
const inspect = process.env.INSPECT ?? "9446";
const phase = process.argv[2] ?? "save";
const tag = process.argv[3] ?? "run";
const screenId = process.argv[4] ?? "9402:158357";
const sidecar = process.env.SIDECAR ?? `${import.meta.dir}/out/copy.fig.fignya`;
const dir = `${import.meta.dir}/out/save-${tag}`;
mkdirSync(dir, { recursive: true });
const log = clock();
const main = await connectMain(inspect);
let failed = 0;

const check = (ok: boolean, what: string): void => {
  if (!ok) failed += 1;
  log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

const ELECTRON = `(globalThis.require ?? process.mainModule.require)("electron")`;
const WINDOWS = `${ELECTRON}.BrowserWindow.getAllWindows().filter((w) => w.isVisible())`;
const WINDOW = `${WINDOWS}[0]`;
const MENU = `${ELECTRON}.Menu.getApplicationMenu()`;

const stubDialogs = (response: number): Promise<unknown> =>
  main(`(() => {
    const e = ${ELECTRON};
    globalThis.__fignyaBoxes ??= [];
    e.dialog.showMessageBox = async (_window, options) => {
      globalThis.__fignyaBoxes.push(options.message);
      return { response: ${response}, checkboxChecked: false };
    };
  })()`);
const boxes = async (): Promise<string[]> => {
  const list = await main("globalThis.__fignyaBoxes ?? []");
  return Array.isArray(list) ? list.filter((m): m is string => typeof m === "string") : [];
};

if (phase === "stale") await stubDialogs(0);
const send = await session(port, 60000, 60000);
const ev = evaluator(send);
const ui = createUi(send, ev, dir);

const edited = async (): Promise<unknown> => main(`${WINDOW}?.isDocumentEdited()`);
const editedIs = (value: boolean): Promise<boolean> => waitFor(async () => (await edited()) === value, 5000);
const save = (): Promise<unknown> => main(`${MENU}.getMenuItemById("save-document").click()`);
const undo = (): Promise<unknown> => main(`${MENU}.items.flatMap((i) => i.submenu?.items ?? []).find((i) => i.label === "Undo").click()`);
const opacity = (): Promise<unknown> => ev(`getComputedStyle(${ROOT}.querySelector("[data-id]")).opacity`);
const opacityIs = (value: string): Promise<boolean> => waitFor(async () => (await opacity()) === value, 5000);
const rootId = async (): Promise<string> => String(await ev(`${ROOT}?.querySelector("[data-id]")?.dataset.id`));
const edit = async (value: number): Promise<void> => {
  await ev(`window.fignya.edit({ target: [${JSON.stringify(await rootId())}], style: { opacity: ${value} } })`);
};
const stored = (): unknown => (existsSync(sidecar) ? JSON.parse(readFileSync(sidecar, "utf8")) : undefined);
const storedEdits = (): unknown[] => {
  const file = stored();
  return isRec(file) && Array.isArray(file.edits) ? file.edits : [];
};
const storedSha = (): unknown => {
  const file = stored();
  return isRec(file) && isRec(file.base) ? file.base.sha256 : undefined;
};

if (!(await imported(ev))) {
  log("import did not finish");
  process.exit(2);
}
setElectronVisible(port, true);
await waitFor(async () => (await ev("document.visibilityState")) === "visible", 5000);
check(await ui.openScreen(screenId), `search ${screenId} opens the screen`);

const savePhase = async (): Promise<void> => {
  check(!existsSync(sidecar), "no sidecar before the first save");
  check((await edited()) === false, "a fresh document is not edited");
  await edit(0.5);
  check(await opacityIs("0.5"), "edit redraws the live screen");
  check(await editedIs(true), "an edit marks the window edited");
  await save();
  check(await waitFor(async () => existsSync(sidecar), 5000), "File → Save writes the sidecar");
  check(await editedIs(false), "after Save the window is not edited");
  const first = stored();
  log(`sidecar ${JSON.stringify(first).slice(0, 300)}`);
  check(isRec(first) && first.format === "fignya-edits" && first.version === 1 && storedEdits().length === 1, "sidecar holds one edit");
  await edit(0.3);
  check(await editedIs(true), "a second edit marks it edited again");
  await undo();
  check(await opacityIs("0.5"), "undo goes back to the saved look");
  check(await editedIs(false), "undo back to the saved state clears the mark");
  await ui.shot("saved");
  await edit(0.2);
  check(await editedIs(true), "a third edit marks it edited");
  await stubDialogs(2);
  await main(`${WINDOW}.close()`);
  await sleep(500);
  const asked = await boxes();
  check(asked.length === 1 && asked[0].includes("copy.fig"), `close with changes asks to save (${JSON.stringify(asked)})`);
  check((await main(`${WINDOWS}.length`)) === 1, "Cancel keeps the window");
  check(storedEdits().length === 1, "Cancel writes nothing");
  await stubDialogs(1);
  await main(`${WINDOW}.close()`).catch(() => undefined);
  await sleep(1000);
  check(storedEdits().length === 1, "Don't Save leaves the sidecar as saved");
};

const reopenPhase = async (): Promise<void> => {
  check(await opacityIs("0.5"), "the saved edit is back after a restart");
  check((await edited()) === false, "a restored document is not edited");
  await ui.shot("restored");
  await undo();
  await sleep(1000);
  check((await opacity()) === "0.5" && (await edited()) === false, "undo after a restart does nothing");
};

const stalePhase = async (): Promise<void> => {
  const asked = await boxes();
  check(asked.some((m) => m === "Not all saved changes were applied"), `a sidecar for another base warns (${JSON.stringify(asked)})`);
  check((await opacity()) !== "0.5", "edits from another base are not applied");
  check((await edited()) === false, "the warned document is not edited");
  check(!existsSync(`${sidecar}.bak`), "no backup before Save");
  await edit(0.7);
  check(await editedIs(true), "an edit marks it edited");
  await save();
  check(await waitFor(async () => existsSync(`${sidecar}.bak`), 5000), "the first Save moves the old sidecar to .bak");
  check(await editedIs(false), "after Save the window is not edited");
  check(storedSha() !== "0".repeat(64) && storedEdits().length === 1, "the new sidecar is for this base");
};

const phases: Record<string, () => Promise<void>> = { save: savePhase, reopen: reopenPhase, stale: stalePhase };
const run = phases[phase];
if (!run) {
  log(`unknown phase ${phase}`);
  process.exit(2);
}
await run();
log(failed ? `${failed} checks failed` : "all checks passed");
process.exit(failed ? 1 : 0);
