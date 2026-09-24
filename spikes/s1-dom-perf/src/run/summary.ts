import { isRec, num, rec } from "../fig/guards";
import type { RunResult } from "./launch";

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  return Number((value ?? 0).toFixed(1));
};

type Column = [string, (r: RunResult) => number | undefined];

const metric = (r: RunResult, ...path: string[]): number | undefined => {
  const last = path.pop() ?? "";
  let node = isRec(r.metrics) ? r.metrics : undefined;
  for (const key of path) node = node ? rec(node, key) : undefined;
  return num(node, last);
};

const COLUMNS: Column[] = [
  ["DOM", (r) => metric(r, "dom")],
  ["first frame, ms", (r) => metric(r, "firstFrameMs")],
  ["+images, ms", (r) => metric(r, "imagesMs")],
  ["pan fps", (r) => metric(r, "pan", "fps")],
  ["pan p95, ms", (r) => metric(r, "pan", "p95")],
  ["zoom fps", (r) => metric(r, "zoom", "fps")],
  ["zoom p95, ms", (r) => metric(r, "zoom", "p95")],
  ["janky", (r) => (metric(r, "pan", "janky") ?? 0) + (metric(r, "zoom", "janky") ?? 0)],
  ["vsync, ms", (r) => metric(r, "refreshMs")],
  ["RSS, MB", (r) => r.rss.totalMb],
];

export const summaryTable = (results: RunResult[]): string => {
  const groups = new Map<string, RunResult[]>();
  for (const r of results) {
    const key = `${r.page}|${r.runtime}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const header = ["page", "runtime", ...COLUMNS.map(([name]) => name)];
  const rows = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([key, runs]) => [
    ...key.split("|"),
    ...COLUMNS.map(([, pick]) => {
      const values = runs.map(pick).filter((v): v is number => v !== undefined);
      return values.length ? String(median(values)) : "—";
    }),
  ]);
  return [header, header.map(() => "---"), ...rows].map((row) => `| ${row.join(" | ")} |`).join("\n");
};

export const failures = (results: RunResult[]): string[] =>
  results.flatMap((r) => (isRec(r.metrics) && typeof r.metrics.error === "string" ? [`${r.runtime} ${r.page}: ${r.metrics.error}`] : []));
