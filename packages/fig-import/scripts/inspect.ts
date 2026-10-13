import { readFileSync } from "node:fs";
import { screenModel } from "@fignya/model";
import { importFig } from "../src";

const path = process.env.FIG_FILE;
if (!path) throw new Error("FIG_FILE is not set");

const started = performance.now();
const { document, images } = importFig(new Uint8Array(readFileSync(path)));
const importMs = Math.round(performance.now() - started);

const resolved = document.pages.flatMap((p) => p.screens).map((s) => {
  const from = performance.now();
  const size = screenModel(document.nodes, s.id)?.nodes.size ?? 0;
  return { size, ms: performance.now() - from };
});
const sorted = (values: number[]): number[] => values.sort((a, b) => a - b);
const sizes = sorted(resolved.map((r) => r.size));
const times = sorted(resolved.map((r) => r.ms));
const at = (list: number[], p: number): number => Math.round(list[Math.round((list.length - 1) * p)] ?? 0);

const kinds = new Map<string, number>();
for (const node of document.nodes.values()) kinds.set(node.kind, (kinds.get(node.kind) ?? 0) + 1);

const overrides = new Map<string, number>();
for (const node of document.nodes.values()) {
  if (node.kind !== "instance") continue;
  for (const override of node.overrides) {
    const { path, ...fields } = override;
    for (const field of ["total", ...Object.keys(fields)]) overrides.set(field, (overrides.get(field) ?? 0) + 1);
  }
}

console.log(
  JSON.stringify({
    importMs,
    pages: document.pages.length,
    screens: sizes.length,
    nodes: document.nodes.size,
    kinds: Object.fromEntries(kinds),
    images: images.size,
    overrides: Object.fromEntries(overrides),
    screenModelNodes: { p50: at(sizes, 0.5), p99: at(sizes, 0.99), max: at(sizes, 1) },
    screenModelMs: { p50: at(times, 0.5), p99: at(times, 0.99), max: at(times, 1) },
  }),
);
