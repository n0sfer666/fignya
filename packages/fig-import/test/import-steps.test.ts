import { describe, expect, it } from "vitest";
import { importFig, readArchive } from "../src";
import { importDocument } from "../src/import-document";
import type { ImportProgress } from "../src/import-progress";
import { importSteps } from "../src/import-steps";
import { figFile } from "./fig-binary";
import { figMessage } from "./fixtures";

const size = (x: number, y: number) => ({ size: { x, y } });

const message = figMessage([
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, type: "CANVAS", name: "Page" },
  { id: 3, parent: 2, type: "FRAME", name: "Screen", ...size(320, 480) },
  { id: 4, parent: 3, position: "a", type: "FRAME", name: "Child", ...size(20, 20) },
  { id: 5, parent: 3, position: "b", type: "TEXT", name: "Label", ...size(50, 10) },
]);

describe("importSteps", () => {
  it("reports decode then convert progress and builds the same document as the eager path", () => {
    const steps = importSteps(readArchive(figFile(message)));
    const progress: ImportProgress[] = [];
    let step = steps.next();
    while (!step.done) {
      progress.push(step.value);
      step = steps.next();
    }
    expect(progress.map((p) => p.phase)).toEqual(["decode", "convert"]);
    expect(progress.every((p) => p.done <= p.total)).toBe(true);
    expect(step.value.document).toEqual(importDocument(message));
    expect(step.value.document.nodes.get("1:3")?.children).toEqual(["1:4", "1:5"]);
  });

  it("drains synchronously in importFig", () => {
    expect(importFig(figFile(message)).document).toEqual(importDocument(message));
  });
});
