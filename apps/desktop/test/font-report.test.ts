import { describe, expect, it } from "vitest";
import type { FontUsage } from "@fignya/fig-import";
import type { FontDownload } from "../shared/fonts";
import { isInstalled } from "../renderer/src/fonts/font-presence";
import { fontReport, fontRequests, mergeResults, requestBatches } from "../renderer/src/fonts/font-report";

const REGULAR = { weight: 400, italic: false };
const BOLD = { weight: 700, italic: false };

const usage: FontUsage[] = [
  { family: "Manrope", nodes: 50, faces: [REGULAR] },
  { family: "Roboto", nodes: 20, faces: [REGULAR, BOLD] },
  { family: "YS Text", nodes: 5, faces: [REGULAR] },
];

const systemHas = (family: string): boolean => family === "Manrope";

describe("fontReport", () => {
  it("lists families neither installed nor cached with the faces to fetch", () => {
    const rows = fontReport(usage, [], systemHas, []);
    expect(rows).toEqual([
      { family: "Roboto", nodes: 20, status: "missing", faces: [REGULAR, BOLD], unavailableFaces: 0 },
      { family: "YS Text", nodes: 5, status: "missing", faces: [REGULAR], unavailableFaces: 0 },
    ]);
    expect(fontRequests(rows)).toEqual([
      { family: "Roboto", faces: [REGULAR, BOLD] },
      { family: "YS Text", faces: [REGULAR] },
    ]);
  });

  it("asks only for faces the cache lacks and never measures cached families", () => {
    const measured: string[] = [];
    const installed = (family: string): boolean => {
      measured.push(family);
      return true;
    };
    const rows = fontReport(usage.slice(1, 2), [{ family: "Roboto", ...REGULAR, file: "a.woff2" }], installed, []);
    expect(measured).toEqual([]);
    expect(fontRequests(rows)).toEqual([{ family: "Roboto", faces: [BOLD] }]);
  });

  it("shows download outcomes and retries only failures", () => {
    const stored = [
      { family: "Roboto", ...REGULAR, file: "a.woff2" },
      { family: "Roboto", ...BOLD, file: "b.woff2" },
    ];
    const results: FontDownload[] = [
      { family: "Roboto", status: "downloaded", missingFaces: 0 },
      { family: "YS Text", status: "unavailable", missingFaces: 1 },
    ];
    const rows = fontReport(usage, stored, systemHas, results);
    expect(rows.map((r) => [r.family, r.status, r.unavailableFaces])).toEqual([
      ["Roboto", "downloaded", 0],
      ["YS Text", "unavailable", 1],
    ]);
    expect(fontRequests(rows)).toEqual([]);
    const failed: FontDownload[] = [
      { family: "Roboto", status: "failed", missingFaces: 2 },
      { family: "YS Text", status: "unavailable", missingFaces: 1 },
    ];
    expect(fontRequests(fontReport(usage, [], systemHas, failed))).toEqual([{ family: "Roboto", faces: [REGULAR, BOLD] }]);
  });
});

describe("download batches", () => {
  it("keeps earlier outcomes of families a retry did not touch", () => {
    const first: FontDownload[] = [
      { family: "Roboto", status: "failed", missingFaces: 2 },
      { family: "YS Text", status: "unavailable", missingFaces: 1 },
    ];
    const retry: FontDownload[] = [{ family: "Roboto", status: "downloaded", missingFaces: 0 }];
    expect(mergeResults(first, retry)).toEqual([first[1], retry[0]]);
    expect(fontRequests(fontReport(usage, [], systemHas, mergeResults(first, retry)))).toEqual([]);
  });

  it("treats only remembered absent faces as unavailable and asks for the rest", () => {
    const absent = [
      { family: "YS Text", ...REGULAR },
      { family: "Roboto", weight: 450, italic: false },
    ];
    const rows = fontReport(usage, [], systemHas, [], absent);
    expect(rows.map((r) => [r.family, r.status])).toEqual([
      ["Roboto", "missing"],
      ["YS Text", "unavailable"],
    ]);
    expect(fontRequests(rows)).toEqual([{ family: "Roboto", faces: [REGULAR, BOLD] }]);
    const partly = fontReport(usage, [{ family: "Roboto", ...REGULAR, file: "a.woff2" }], systemHas, [], [{ family: "Roboto", ...BOLD }]);
    expect(partly.map((r) => [r.family, r.status, r.unavailableFaces])).toEqual([
      ["Roboto", "downloaded", 1],
      ["YS Text", "missing", 0],
    ]);
    expect(fontRequests(partly)).toEqual([{ family: "YS Text", faces: [REGULAR] }]);
    const failed: FontDownload[] = [{ family: "Roboto", status: "failed", missingFaces: 1 }];
    expect(fontRequests(fontReport(usage, [], systemHas, failed, [{ family: "Roboto", ...BOLD }]))).toEqual([
      { family: "Roboto", faces: [REGULAR] },
      { family: "YS Text", faces: [REGULAR] },
    ]);
  });

  it("keeps counting remembered absent faces after the rest of the family downloads", () => {
    const fetched: FontDownload[] = [{ family: "Roboto", status: "downloaded", missingFaces: 0 }];
    const rows = fontReport(usage.slice(1, 2), [{ family: "Roboto", ...REGULAR, file: "a.woff2" }], systemHas, fetched, [{ family: "Roboto", ...BOLD }]);
    expect(rows.map((r) => [r.family, r.status, r.unavailableFaces])).toEqual([["Roboto", "downloaded", 1]]);
    expect(fontRequests(rows)).toEqual([]);
  });

  it("splits requests to the limits main accepts", () => {
    const faces = Array.from({ length: 40 }, (_, i) => ({ weight: i + 1, italic: false }));
    const many: FontUsage[] = Array.from({ length: 70 }, (_, i) => ({ family: `F${i}`, nodes: 1, faces }));
    const batches = requestBatches(fontReport(many, [], () => false, []));
    expect(batches.map((b) => b.length)).toEqual([64, 6]);
    expect(batches[0]?.[0]?.faces).toHaveLength(32);
  });
});

describe("isInstalled", () => {
  it("detects a family whose metrics differ from a generic fallback", () => {
    const widths: Record<string, number> = { "72px monospace": 10, "72px serif": 8, "72px 'Inter',monospace": 9, "72px 'Inter',serif": 9 };
    const measure = (font: string): number => widths[font] ?? (font.includes("serif") && !font.includes("mono") ? 8 : 10);
    expect(isInstalled("Inter", measure)).toBe(true);
    expect(isInstalled("Roboto", measure)).toBe(false);
  });
});
