import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Client } from "../../apps/desktop/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StreamableHTTPClientTransport } from "../../apps/desktop/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js";
import { clock, evaluator, imported, isRec, session, setElectronVisible, waitFor } from "./cdp";
import { connectMain } from "./main-cdp";
import { ROOT } from "./ui";

const port = process.env.PORT ?? "9445";
const inspect = process.env.INSPECT ?? "9446";
const mcpPort = process.env.FIGNYA_MCP_PORT ?? "7341";
const tag = process.argv[2] ?? "run";
const screenId = process.argv[3] ?? "2479:25954";
const userData = join(homedir(), "Library", "Application Support", "fignya");
const url = `http://127.0.0.1:${mcpPort}/mcp`;
const dir = `${import.meta.dir}/out/mcp-${tag}`;
mkdirSync(dir, { recursive: true });
const log = clock();
const ev = evaluator(await session(port, 60000, 60000));
const main = await connectMain(inspect);
let failed = 0;

const check = (ok: boolean, what: string): void => {
  if (!ok) failed += 1;
  log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

const MENU = `(globalThis.require ?? process.mainModule.require)("electron").Menu.getApplicationMenu()`;
const menuItem = (id: string, field: "checked" | "enabled"): Promise<unknown> => main(`${MENU}?.getMenuItemById(${JSON.stringify(id)})?.${field}`);
const clickItem = (id: string): Promise<unknown> => main(`${MENU}.getMenuItemById(${JSON.stringify(id)}).click()`);
const status = (headers: Record<string, string>): Promise<number> =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: "{}" }).then((res) => res.status, () => 0);

const token = (): string => {
  const config: unknown = JSON.parse(readFileSync(join(userData, "mcp.json"), "utf8"));
  return isRec(config) && typeof config.token === "string" ? config.token : "";
};

type Result = { content: { type: string; text?: string; data?: string }[]; isError?: boolean };
const isResult = (value: unknown): value is Result => isRec(value) && Array.isArray(value.content);
const textOf = (result: Result): string => result.content.find((part) => part.type === "text")?.text ?? "";

const nodeColor = (id: string): Promise<unknown> =>
  ev(`(() => { const el = ${ROOT}?.querySelector('[data-id="${id}"]'); return el ? getComputedStyle(el).color : undefined; })()`);

if (!(await imported(ev))) {
  log("import did not finish");
  process.exit(2);
}
setElectronVisible(port, true);
await waitFor(async () => (await ev("document.visibilityState")) === "visible", 5000);

const wasEnabled = (await menuItem("mcp-server", "checked")) === true;
if (!wasEnabled) await clickItem("mcp-server");
check(await waitFor(async () => (await status({})) === 401, 10000), "Enable MCP Server starts the server, no token → 401");
check((await status({ Authorization: `Bearer ${"0".repeat(64)}` })) === 401, "a foreign token → 401");
check((await status({ Authorization: `Bearer ${token()}`, Origin: "https://evil.test" })) === 403, "an Origin header → 403");

const client = new Client({ name: "run-mcp", version: "1" });
await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { Authorization: `Bearer ${token()}` } } }));
const call = async (name: string, args: Record<string, unknown> = {}): Promise<Result> => {
  const result: unknown = await client.callTool({ name, arguments: args });
  return isResult(result) ? result : { content: [], isError: true };
};
check((await client.listTools()).tools.length === 10, "the client lists 10 tools");
check(await waitFor(async () => (await ev(`!!document.querySelector(".agent-badge")`)) === true, 5000), "the agent badge shows");

check(textOf(await call("document")).includes(screenId), `document lists ${screenId}`);
check(textOf(await call("open_screen", { screenId })) === "opened", "open_screen answers");
check(await waitFor(async () => (await ev(`${ROOT}?.host.dataset.screen`)) === screenId, 15000), "open_screen makes the screen live");

const outline = textOf(await call("outline", { address: screenId }));
writeFileSync(`${dir}/outline.txt`, outline);
log(`outline: ${outline.split("\n").length} lines`);
const texts = [...outline.matchAll(/^\s*([0-9:]+) "(?:[^"\\]|\\.)*" text /gm)].flatMap((match) => (match[1] ? [match[1]] : []));
let address: string | undefined;
for (const candidate of texts) if (address === undefined && typeof (await nodeColor(candidate)) === "string") address = candidate;
log(`text node: ${address ?? "none"} of ${texts.length}`);
if (!address) {
  log("no text node of the outline on the canvas");
  process.exit(3);
}
const instance = /^\s*([0-9:]+) "(?:[^"\\]|\\.)*" instance /m.exec(outline)?.[1];
if (instance) check(textOf(await call("outline", { address: instance })).split("\n").length > 1, `outline expands the instance ${instance}`);

const details: unknown = JSON.parse(textOf(await call("inspect", { address })));
writeFileSync(`${dir}/inspect.json`, JSON.stringify(details, null, 2));
check(isRec(details) && isRec(details.editable) && typeof details.editable.color === "string", "inspect gives the editable color");

const saveShot = async (name: string, target: string): Promise<{ bytes: string; size: string }> => {
  const result = await call("screenshot", { address: target });
  const data = result.content.find((part) => part.type === "image")?.data ?? "";
  writeFileSync(`${dir}/${name}.png`, Buffer.from(data, "base64"));
  return { bytes: data, size: textOf(result) };
};
const before = await saveShot("screen-before", screenId);
const [width, height] = before.size.split(/[×\s]/).map(Number);
log(`screen shot ${before.size}`);
check(before.bytes.length > 0 && (width ?? 0) <= 1568 && (height ?? 0) <= 1568, "the screen shot fits 1568 px");

const original = await nodeColor(address);
const refused = await call("apply_edits", { edits: [{ target: address, text: "x" }, { target: address, style: { zIndex: "2" } }] });
log(`refused: ${textOf(refused)}`);
check(refused.isError === true && textOf(refused).includes('"index":1'), "an invalid edit refuses the batch with its index");
check((await nodeColor(address)) === original, "a refused batch leaves the canvas as it was");

const applied = await call("apply_edits", { edits: [{ target: address, style: { color: "#ff00aa" } }] });
log(`applied: ${textOf(applied)}`);
check(applied.isError !== true, "apply_edits applies a css color");
check(await waitFor(async () => (await nodeColor(address)) === "rgb(255, 0, 170)", 5000), "the canvas shows the new color");
check(await waitFor(async () => (await ev(`!!document.querySelector(".agent-flash")`)) === true, 1500), "the changed node flashes");
check((await menuItem("undo-agent-edit", "enabled")) === true, "Undo Agent Edit is enabled");
const after = await saveShot("screen-after", screenId);
check(after.bytes !== before.bytes, "the screen shot reflects the edit");
log(`node shot ${(await saveShot("node", address)).size}`);

check(textOf(await call("select", { address })) === "selected", "select answers");
const selected = async (): Promise<boolean> => {
  const selection: unknown = JSON.parse(textOf(await call("selection")));
  return isRec(selection) && selection.selection === address;
};
check(await waitFor(selected, 3000), "selection reports the selected node");

const undone = await call("undo_agent_edit");
log(`undone: ${textOf(undone)}`);
check(await waitFor(async () => (await nodeColor(address)) === original, 5000), "undo_agent_edit restores the color");
check((await menuItem("undo-agent-edit", "enabled")) === false, "Undo Agent Edit is disabled again");
const again = await call("undo_agent_edit");
check(again.isError === true, `a second undo_agent_edit is refused: ${textOf(again)}`);

await client.close();
const logged = readFileSync(join(userData, "logs", "mcp.log"), "utf8");
check(logged.includes('"tool":"apply_edits"') && !logged.includes("#ff00aa"), "mcp.log has the calls without edit values");
if (!wasEnabled) await clickItem("mcp-server");
if (!wasEnabled) check(await waitFor(async () => (await status({})) === 0, 5000), "disabling stops the server");
log(failed ? `${failed} checks failed` : "all checks passed");
process.exit(failed ? 1 : 0);
