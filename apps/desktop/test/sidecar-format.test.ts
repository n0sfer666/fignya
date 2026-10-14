import { describe, expect, it } from "vitest";
import { parseSidecar, sameBase, serializeSidecar, type Sidecar } from "../importer/sidecar-format";

const sidecar: Sidecar = {
  base: { size: 10, sha256: "ab".repeat(32) },
  edits: [
    { target: ["1:2"], style: { width: 140 } },
    { target: ["1:3", "1:4"], text: "Hi" },
  ],
};

describe("sidecar format", () => {
  it("round-trips through readable JSON", () => {
    const text = serializeSidecar(sidecar);
    expect(JSON.parse(text)).toMatchObject({ format: "fignya-edits", version: 1 });
    expect(text.endsWith("\n")).toBe(true);
    expect(text).toContain('\n  "edits": [');
    expect(parseSidecar(text)).toEqual(sidecar);
  });

  it("drops unknown fields of saved edits", () => {
    const valid = JSON.parse(serializeSidecar(sidecar));
    const text = JSON.stringify({ ...valid, edits: [{ ...valid.edits[0], junk: 1 }, valid.edits[1]] });
    expect(parseSidecar(text)).toEqual(sidecar);
  });

  it("rejects text that is not a version 1 sidecar", () => {
    const valid = JSON.parse(serializeSidecar(sidecar));
    const variants = [
      "",
      "{",
      "null",
      "[]",
      JSON.stringify({ ...valid, format: "other" }),
      JSON.stringify({ ...valid, version: 2 }),
      JSON.stringify({ ...valid, base: { size: "10", sha256: valid.base.sha256 } }),
      JSON.stringify({ ...valid, base: { size: 10, sha256: "xyz" } }),
      JSON.stringify({ ...valid, edits: {} }),
      JSON.stringify({ ...valid, edits: [{ target: [], style: { width: 1 } }] }),
      JSON.stringify({ ...valid, edits: [{ target: ["1:2"], style: { width: "wide" } }] }),
    ];
    for (const text of variants) expect(parseSidecar(text)).toBeUndefined();
  });

  it("matches bases by size and hash", () => {
    expect(sameBase(sidecar.base, { ...sidecar.base })).toBe(true);
    expect(sameBase(sidecar.base, { ...sidecar.base, size: 11 })).toBe(false);
    expect(sameBase(sidecar.base, { ...sidecar.base, sha256: "cd".repeat(32) })).toBe(false);
  });
});
