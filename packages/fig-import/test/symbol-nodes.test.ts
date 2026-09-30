import { describe, expect, it } from "vitest";
import { buildIndex } from "../src/tree/node-index";
import { symbolNodes } from "../src/tree/symbol-nodes";
import { figNode } from "./fixtures";

describe("symbolNodes", () => {
  it("keeps component subtrees, orphaned ones too, and drops the rest of the page", () => {
    const index = buildIndex(
      [
        { id: 1, type: "DOCUMENT" },
        { id: 2, parent: 1, type: "CANVAS" },
        { id: 3, parent: 2, position: "a", type: "FRAME" },
        { id: 4, parent: 3, type: "INSTANCE" },
        { id: 5, parent: 2, position: "b", type: "FRAME" },
        { id: 6, parent: 5, type: "SYMBOL" },
        { id: 7, parent: 6, type: "FRAME" },
        { id: 8, parent: 7, type: "INSTANCE" },
        { id: 9, parent: 8, type: "SYMBOL" },
        { id: 10, parent: 99, type: "SYMBOL" },
        { id: 11, parent: 10, type: "TEXT" },
      ].map(figNode),
      [],
    );
    expect([...symbolNodes(index.byKey.values()).keys()].sort()).toEqual(["1:10", "1:11", "1:6", "1:7", "1:8", "1:9"]);
  });
});
