export const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const waitFor = async (check: () => Promise<boolean>, ms: number): Promise<boolean> => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await check()) return true;
    await sleep(250);
  }
  return false;
};

export const clock = (): ((s: string) => void) => {
  const t0 = Date.now();
  return (s) => console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s ${s}`);
};

const mainTarget = async (port: string, waitMs: number): Promise<string> => {
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    try {
      const list: unknown = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const found = Array.isArray(list)
        ? list.find((t): t is Record<string, unknown> => isRec(t) && t.type === "page" && typeof t.url === "string" && !t.url.includes("thumb.html"))
        : undefined;
      if (found && typeof found.webSocketDebuggerUrl === "string") return found.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error(`no main target on port ${port}`);
};

export type Evaluate = (expression: string) => Promise<unknown>;
export type Send = (method: string, params: Record<string, unknown>) => Promise<unknown>;

export const session = async (port: string, waitMs = 60000, callMs = 15000): Promise<Send> => socket(await mainTarget(port, waitMs), callMs);

export const socket = async (url: string, callMs = 15000): Promise<Send> => {
  const ws = new WebSocket(url);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  ws.onmessage = (e) => {
    const m: unknown = JSON.parse(String(e.data));
    if (!isRec(m) || typeof m.id !== "number") return;
    const call = pending.get(m.id);
    pending.delete(m.id);
    if (!call) return;
    if (isRec(m.error)) return call.reject(new Error(`CDP error: ${JSON.stringify(m.error)}`));
    call.resolve(m.result);
  };
  ws.onclose = () => {
    for (const call of pending.values()) call.reject(new Error("CDP socket closed"));
    pending.clear();
  };
  return (method, params) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out after ${callMs} ms: ${JSON.stringify(params).slice(0, 80)}`));
      }, callMs);
      const done = <TValue,>(f: (v: TValue) => void) => (v: TValue) => {
        clearTimeout(timer);
        f(v);
      };
      pending.set(id, { resolve: done(resolve), reject: done(reject) });
      ws.send(JSON.stringify({ id, method, params }));
    });
};

export const evaluator = (send: Send): Evaluate => async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (isRec(result) && isRec(result.exceptionDetails)) throw new Error(`evaluate threw: ${JSON.stringify(result.exceptionDetails)}`);
  return isRec(result) && isRec(result.result) ? result.result.value : undefined;
};

export const connect = async (port: string, waitMs = 60000, callMs = 15000): Promise<Evaluate> => evaluator(await session(port, waitMs, callMs));

export const imported = (ev: Evaluate): Promise<boolean> =>
  waitFor(async () => (await ev(`document.querySelectorAll("ul.pages li").length`)) !== 0, 120000);

const jxa = (script: string): void => {
  const r = Bun.spawnSync(["osascript", "-l", "JavaScript", "-e", script]);
  if (r.exitCode !== 0) console.error(`osascript: ${r.stderr.toString().trim()}`);
};

const debuggedPids = (port: string): string[] =>
  Bun.spawnSync(["pgrep", "-f", `remote-debugging-port=${port}( |$)`]).stdout.toString().split("\n").filter(Boolean);

const toggle = (visible: boolean): string =>
  visible ? "{ app.unhide; app.activateWithOptions($.NSApplicationActivateAllWindows); }" : "app.hide;";

export const setElectronVisible = (port: string, visible: boolean): void => {
  const pids = debuggedPids(port);
  if (pids.length === 0) console.error(`no process with remote-debugging-port=${port}`);
  jxa(
    `ObjC.import("AppKit"); for (const pid of [${pids.join(", ")}]) { const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(pid); if (!app.isNil()) ${toggle(visible)} }`,
  );
};

export const shownAfterImport = async (ev: Evaluate, port: string, log: (s: string) => void): Promise<number> => {
  if (!(await imported(ev))) {
    log("import did not finish");
    return 2;
  }
  log("imported");
  setElectronVisible(port, true);
  if (await waitFor(async () => (await ev("document.visibilityState")) === "visible", 10000)) return 0;
  log(`window not visible: ${String(await ev("document.visibilityState"))}`);
  return 3;
};
