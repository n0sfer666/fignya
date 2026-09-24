import { describe, expect, it } from "vitest";
import { blobPaths, pathFromBlob, vectorPaths } from "../src/convert/vector";
import { solid } from "./fixtures";

const blobOf = (commands: [number, ...number[]][]): Uint8Array => {
  const size = commands.reduce((sum, [, ...values]) => sum + 1 + values.length * 4, 0);
  const view = new DataView(new ArrayBuffer(size));
  let offset = 0;
  for (const [op, ...values] of commands) {
    view.setUint8(offset, op);
    offset += 1;
    for (const v of values) {
      view.setFloat32(offset, v, true);
      offset += 4;
    }
  }
  return new Uint8Array(view.buffer);
};

describe("pathFromBlob", () => {
  it("decodes move/line/quad/cubic/close", () => {
    const blob = blobOf([[1, 0, 0], [2, 10.5, 0], [3, 1, 2, 3, 4], [4, 1, 2, 3, 4, 5, 6], [0]]);
    expect(pathFromBlob(blob)).toBe("M0 0L10.5 0Q1 2 3 4C1 2 3 4 5 6Z");
  });

  it("stops at unknown command", () => {
    expect(pathFromBlob(blobOf([[1, 1, 1], [9]]))).toBe("M1 1");
  });

  it("stops at truncated command", () => {
    expect(pathFromBlob(new Uint8Array([1, 0, 0, 0]))).toBe("");
  });
});

describe("vectorPaths", () => {
  it("emits fill and stroke geometry with winding rule", () => {
    const blobs = [blobOf([[1, 0, 0], [0]]), blobOf([[1, 1, 1], [0]])];
    const raw = {
      fillPaints: [solid(1, 0, 0)],
      strokePaints: [solid(0, 0, 1)],
      fillGeometry: [{ commandsBlob: 0, windingRule: "ODD" }],
      strokeGeometry: [{ commandsBlob: 1 }, { commandsBlob: 7 }],
    };
    expect(vectorPaths(raw, blobPaths(blobs))).toEqual([
      { d: "M0 0Z", fill: { r: 255, g: 0, b: 0, a: 1 }, rule: "evenodd" },
      { d: "M1 1Z", fill: { r: 0, g: 0, b: 255, a: 1 }, rule: "nonzero" },
    ]);
  });

  it("skips geometry without solid paint", () => {
    expect(vectorPaths({ fillGeometry: [{ commandsBlob: 0 }] }, blobPaths([blobOf([[0]])]))).toEqual([]);
  });
});

describe("blobPaths", () => {
  it("decodes each blob once and ignores missing indexes", () => {
    const blob = blobOf([[1, 2, 3]]);
    const pathOf = blobPaths([blob]);
    expect(pathOf(0)).toBe("M2 3");
    blob.fill(0);
    expect(pathOf(0)).toBe("M2 3");
    expect(pathOf(5)).toBeUndefined();
  });
});
