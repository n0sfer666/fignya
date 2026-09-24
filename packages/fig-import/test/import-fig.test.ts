import { describe, expect, it } from "vitest";
import { importFig } from "../src";
import { encodeMessage, figFile } from "./fig-binary";
import { box, guid } from "./fixtures";

const message = {
  nodeChanges: [
    { guid: guid(1), type: "DOCUMENT" },
    { guid: guid(2), parentIndex: { guid: guid(1), position: "a" }, type: "CANVAS", name: "Page" },
    { guid: guid(3), parentIndex: { guid: guid(2), position: "a" }, type: "FRAME", name: "Screen", size: box(0, 0, 320, 480).size },
  ],
};

describe("importFig", () => {
  it("decodes a kiwi .fig archive into a document with images", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const { document, images } = importFig(figFile(message, { abcd: png }));
    expect(document.pages).toEqual([{ id: "1:2", name: "Page", screens: [{ id: "1:3", name: "Screen", x: 0, y: 0, width: 320, height: 480 }] }]);
    expect(document.nodes.get("1:3")?.kind).toBe("frame");
    expect(images.get("abcd")).toEqual(png);
  });

  it("accepts a bare fig-kiwi canvas without archive", () => {
    const { document, images } = importFig(encodeMessage(message));
    expect(document.pages[0]?.screens.map((s) => s.id)).toEqual(["1:3"]);
    expect(images.size).toBe(0);
  });

  it("rejects non-fig data", () => {
    expect(() => importFig(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
