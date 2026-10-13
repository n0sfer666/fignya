import { readFileSync } from "node:fs";
import { importSteps, readArchive } from "../src";
import { drain } from "../src/drain";

const path = process.env.FIG_FILE;
if (!path) throw new Error("FIG_FILE is not set");

const mb = (bytes: number): number => Math.round(bytes / 1048576);
const started = performance.now();
const { document } = drain(importSteps(readArchive(new Uint8Array(readFileSync(path)))));
const importMs = Math.round(performance.now() - started);
const gc: unknown = Reflect.get(globalThis, "gc");
if (typeof gc === "function") gc();

console.log(
  JSON.stringify({
    importMs,
    nodes: document.nodes.size,
    maxRssMb: Math.round(process.resourceUsage().maxRSS / 1024),
    heapAfterGcMb: mb(process.memoryUsage().heapUsed),
  }),
);
