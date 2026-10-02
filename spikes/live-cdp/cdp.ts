const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

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

export const connect = async (port: string, waitMs = 60000, callMs = 15000): Promise<Evaluate> => {
  const ws = new WebSocket(await mainTarget(port, waitMs));
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
    if (isRec(m.result) && isRec(m.result.exceptionDetails)) return call.reject(new Error(`evaluate threw: ${JSON.stringify(m.result.exceptionDetails)}`));
    call.resolve(isRec(m.result) && isRec(m.result.result) ? m.result.result.value : undefined);
  };
  ws.onclose = () => {
    for (const call of pending.values()) call.reject(new Error("CDP socket closed"));
    pending.clear();
  };
  return (expression) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`evaluate timed out after ${callMs} ms: ${expression.slice(0, 80)}`));
      }, callMs);
      const done = <TValue,>(f: (v: TValue) => void) => (v: TValue) => {
        clearTimeout(timer);
        f(v);
      };
      pending.set(id, { resolve: done(resolve), reject: done(reject) });
      ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, returnByValue: true, awaitPromise: true } }));
    });
};

export const osascript = (...lines: string[]): void => {
  const r = Bun.spawnSync(["osascript", ...lines.flatMap((l) => ["-e", l])]);
  if (r.exitCode !== 0) console.error(`osascript: ${r.stderr.toString().trim()}`);
};

export const setElectronVisible = (visible: boolean): void =>
  osascript(
    'tell application "System Events"',
    visible ? 'set frontmost of process "Electron" to true' : 'set visible of process "Electron" to false',
    "end tell",
  );
