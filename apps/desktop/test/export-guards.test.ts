import { describe, expect, it } from "vitest";
import { imageHashList, isImageHashes, isScreenExport } from "../main/export-guards";

const bundle = { screenId: "1:2", html: "<!doctype html>", css: "body{}", images: ["ab12"], families: ["Inter"] };

describe("isScreenExport", () => {
  it("accepts an export of a screen", () => {
    expect(isScreenExport(bundle)).toBe(true);
    expect(isScreenExport({ ...bundle, images: [], families: [] })).toBe(true);
  });

  it("rejects malformed exports from the renderer", () => {
    expect(isScreenExport(null)).toBe(false);
    expect(isScreenExport({ ...bundle, screenId: "" })).toBe(false);
    expect(isScreenExport({ ...bundle, html: 1 })).toBe(false);
    expect(isScreenExport({ ...bundle, css: undefined })).toBe(false);
    expect(isScreenExport({ ...bundle, images: ["../x"] })).toBe(false);
    expect(isScreenExport({ ...bundle, images: "ab12" })).toBe(false);
    expect(isScreenExport({ ...bundle, families: [1] })).toBe(false);
    expect(isScreenExport({ ...bundle, families: ["x".repeat(257)] })).toBe(false);
    expect(isScreenExport({ ...bundle, html: "x".repeat(64 * 1024 * 1024 + 1) })).toBe(false);
  });
});

describe("isImageHashes", () => {
  it("accepts lowercase hex hashes only", () => {
    expect(isImageHashes(["ab12", "00ff"])).toBe(true);
    expect(isImageHashes([])).toBe(true);
    expect(isImageHashes(["AB"])).toBe(false);
    expect(isImageHashes(["a/b"])).toBe(false);
    expect(isImageHashes([""])).toBe(false);
    expect(isImageHashes({})).toBe(false);
    expect(isImageHashes(Array.from({ length: 10_001 }, () => "ab"))).toBe(false);
  });
});

describe("imageHashList", () => {
  it("keeps the valid hashes of a string list once and rejects the rest", () => {
    expect(imageHashList(["ab12", "AB", "", "a/b", "ab12"])).toEqual(["ab12"]);
    expect(imageHashList([1])).toBeUndefined();
    expect(imageHashList("ab")).toBeUndefined();
    expect(imageHashList(Array.from({ length: 10_001 }, () => "ab"))).toBeUndefined();
  });
});
