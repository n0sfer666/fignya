import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { launch, type Runtime, type RunResult } from "./launch";
import { powerWarnings } from "./power";
import { failures, summaryTable } from "./summary";

const root = join(import.meta.dir, "..", "..");
const dist = join(root, "dist");
const resultsDir = join(root, "results");
const reps = Number(process.env.REPS ?? 3);
const only = new Set((process.env.RUNTIMES ?? "electron,tauri").split(","));
const PAGES = ["screen-p50.html", "screen-p99.html", "screen-max.html", "overview.html"];
const MODES = ["", "?wc=1"];

const RUNTIMES: Runtime[] = [
  { name: "electron", cmd: [join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"), join(root, "out/bench.cjs")], webkit: false },
  { name: "tauri", cmd: [join(root, "tauri/target/release/s1-tauri")], webkit: true },
];

const runtimes = RUNTIMES.filter((r) => only.has(r.name) && existsSync(r.cmd[0] ?? ""));
if (runtimes.length === 0) throw new Error("no runtime binaries found: run `bun run build:all` first");
if (!existsSync(join(dist, "overview.html"))) throw new Error("dist is empty: run `bun run build:all` first");
mkdirSync(resultsDir, { recursive: true });
for (const warning of powerWarnings()) console.warn(`WARNING ${warning}: results are not comparable`);

const results: RunResult[] = [];
for (let rep = 1; rep <= reps; rep += 1) {
  for (const page of PAGES.flatMap((p) => MODES.map((m) => p + m))) {
    for (const runtime of runtimes) {
      const result = await launch(runtime, page, rep, dist, join(resultsDir, ".report"));
      results.push(result);
      console.log(`rep ${rep} ${runtime.name.padEnd(8)} ${page.padEnd(22)} RSS ${result.rss.totalMb} MB`);
    }
  }
}

const stamp = new Date().toISOString().replaceAll(":", "-").slice(0, 19);
await Bun.write(join(resultsDir, `${stamp}.json`), JSON.stringify(results, null, 2));
const table = summaryTable(results);
await Bun.write(join(resultsDir, `${stamp}.md`), `${table}\n`);
console.log(`\n${table}\n`);
for (const failure of failures(results)) console.error(`FAILED ${failure}`);
console.log(`raw: results/${stamp}.json`);
