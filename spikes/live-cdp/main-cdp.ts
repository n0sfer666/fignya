import { isRec, sleep, socket, type Evaluate } from "./cdp";

const nodeTarget = async (port: string, waitMs: number): Promise<string> => {
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    try {
      const list: unknown = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const found = Array.isArray(list) ? list.find((t): t is Record<string, unknown> => isRec(t) && typeof t.webSocketDebuggerUrl === "string") : undefined;
      if (found && typeof found.webSocketDebuggerUrl === "string") return found.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error(`no node inspector on port ${port}`);
};

export const connectMain = async (port: string, waitMs = 60000, callMs = 30000): Promise<Evaluate> => {
  const send = await socket(await nodeTarget(port, waitMs), callMs);
  return async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true });
    if (isRec(result) && isRec(result.exceptionDetails)) throw new Error(`main evaluate threw: ${JSON.stringify(result.exceptionDetails)}`);
    return isRec(result) && isRec(result.result) ? result.result.value : undefined;
  };
};
