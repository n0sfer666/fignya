import { describe, expect, it } from "vitest";
import { readMessage } from "../src/fig/read-message";
import { slimNode } from "../src/fig/kept-fields";
import { encodeMessage } from "./fig-binary";
import { guid } from "./fixtures";

const nodes = [
  { guid: guid(1), type: "DOCUMENT" },
  { guid: guid(2), parentIndex: { guid: guid(1), position: "a" }, type: "CANVAS", name: "Page", derivedSize: { x: 1, y: 2 } },
];

const message = {
  type: "NODE_CHANGES",
  sessionID: 7,
  labels: ["a", "b"],
  origin: guid(9),
  nodeChanges: nodes,
  blobs: [{ bytes: new Uint8Array([1, 2]) }],
};

const drainAll = (data: Uint8Array) => {
  const reader = readMessage(data);
  const seen: { index: number; total: number; name: unknown }[] = [];
  let step = reader.next();
  while (!step.done) {
    seen.push({ index: step.value.index, total: step.value.total, name: step.value.node.name });
    step = reader.next();
  }
  return { seen, rest: step.value };
};

describe("readMessage", () => {
  it("streams node changes one by one with position and total", () => {
    const { seen } = drainAll(encodeMessage(message));
    expect(seen).toEqual([
      { index: 0, total: 2, name: undefined },
      { index: 1, total: 2, name: "Page" },
    ]);
  });

  it("returns the other message fields before and after node changes", () => {
    const { rest } = drainAll(encodeMessage(message));
    expect(rest).toEqual({ type: "NODE_CHANGES", sessionID: 7, labels: ["a", "b"], origin: guid(9), blobs: [{ bytes: new Uint8Array([1, 2]) }] });
  });

  it("decodes node changes fully so slimming is a separate step", () => {
    const reader = readMessage(encodeMessage(message));
    reader.next();
    const second = reader.next();
    expect(second.done ? undefined : second.value.node.derivedSize).toEqual({ x: 1, y: 2 });
  });
});

describe("slimNode", () => {
  it("keeps converter fields and drops derived data", () => {
    const raw = { ...nodes[1], textData: { characters: "hi" }, derivedTextData: { glyphs: [1] }, derivedSymbolData: [{ size: { x: 1, y: 1 }, fillGeometry: [{}] }] };
    expect(slimNode(raw)).toEqual({
      guid: guid(2), parentIndex: { guid: guid(1), position: "a" }, type: "CANVAS", name: "Page",
      textData: { characters: "hi" }, derivedSymbolData: [{ size: { x: 1, y: 1 } }],
    });
  });
});
