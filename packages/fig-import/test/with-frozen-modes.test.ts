import { describe, expect, it } from "vitest";
import { str } from "../src/fig/guards";
import { buildIndex } from "../src/tree/node-index";
import { NO_PAINTS, type VariablePaints } from "../src/tree/variables";
import { withFrozenModes } from "../src/tree/with-frozen-modes";
import { figNode } from "./fixtures";

const index = buildIndex(
  [
    { id: 1, type: "DOCUMENT" },
    { id: 2, parent: 1, type: "CANVAS" },
    { id: 3, parent: 2, position: "a", type: "INSTANCE", name: "I" },
    { id: 4, parent: 2, position: "b", type: "SYMBOL", name: "S" },
    { id: 5, parent: 4, type: "FRAME", name: "F" },
  ].map(figNode),
  [],
);

const raw = (key: string) => index.byKey.get(key)?.raw ?? {};

describe("withFrozenModes", () => {
  it("answers instances and components from modes computed once", () => {
    let calls = 0;
    const live: VariablePaints = { ...NO_PAINTS, modesOf: (node) => (calls += 1, new Map([["set", str(node, "name") ?? ""]])) };
    const frozen = withFrozenModes(index.byKey.values(), live);
    expect(calls).toBe(2);
    expect([frozen.modesOf(raw("1:3")), frozen.modesOf(raw("1:4"))]).toEqual([new Map([["set", "I"]]), new Map([["set", "S"]])]);
    expect(calls).toBe(2);
    expect(() => frozen.modesOf(raw("1:5"))).toThrow("variable modes of 1:5 are not frozen");
  });

  it("keeps a file without variables as is", () => {
    expect(withFrozenModes(index.byKey.values(), NO_PAINTS)).toBe(NO_PAINTS);
  });
});
