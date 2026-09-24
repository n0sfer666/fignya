import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { descendants, listProcesses, summarizeRss, webkitSince, type Rss } from "./processes";

export type Runtime = { name: string; cmd: string[]; webkit: boolean };

export type RunResult = { runtime: string; page: string; rep: number; rss: Rss; metrics: unknown };

const TIMEOUT_MS = 90_000;
const SETTLE_MS = 1_500;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitFile = async (path: string): Promise<string> => {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (existsSync(path)) return readFileSync(path, "utf8");
    await sleep(200);
  }
  throw new Error(`timeout waiting for ${path}`);
};

const parseReport = (query: string): unknown => {
  const raw = new URLSearchParams(query).get("r");
  if (!raw) throw new Error(`empty report: ${query.slice(0, 200)}`);
  return JSON.parse(raw);
};

export const launch = async (runtime: Runtime, page: string, rep: number, dist: string, resultFile: string): Promise<RunResult> => {
  if (existsSync(resultFile)) unlinkSync(resultFile);
  const started = Date.now();
  const child = Bun.spawn(runtime.cmd, {
    env: { ...process.env, DIST_DIR: dist, RESULT_FILE: resultFile, SCENARIO: page },
    stdout: "ignore",
    stderr: "ignore",
  });
  try {
    const metrics = parseReport(await waitFile(resultFile));
    await sleep(SETTLE_MS);
    const all = await listProcesses();
    const ageS = Math.ceil((Date.now() - started) / 1000) + 1;
    const own = descendants(all, child.pid);
    const procs = runtime.webkit ? [...own, ...webkitSince(all, ageS)] : own;
    return { runtime: runtime.name, page, rep, rss: summarizeRss(procs), metrics };
  } finally {
    child.kill();
    await child.exited;
    await sleep(SETTLE_MS);
  }
};
