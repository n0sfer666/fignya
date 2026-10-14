import { describe, expect, it } from "vitest";
import { compactEdits } from "../src";

describe("compactEdits", () => {
  it("merges edits of one target into one in the order targets first appear", () => {
    expect(
      compactEdits([
        { target: ["f"], style: { width: 120, opacity: 0.5 } },
        { target: ["i", "t"], text: "One" },
        { target: ["f"], style: { width: 140 } },
        { target: ["i", "t"], text: "Two", style: { fontSize: 14 } },
      ]),
    ).toEqual([
      { target: ["f"], style: { width: 140, opacity: 0.5 } },
      { target: ["i", "t"], text: "Two", style: { fontSize: 14 } },
    ]);
  });

  it("keeps a nested target apart from its head", () => {
    expect(compactEdits([{ target: ["i"], style: { width: 1 } }, { target: ["i", "t"], style: { width: 2 } }])).toEqual([
      { target: ["i"], style: { width: 1 } },
      { target: ["i", "t"], style: { width: 2 } },
    ]);
  });

  it("returns nothing for no edits", () => {
    expect(compactEdits([])).toEqual([]);
  });
});
