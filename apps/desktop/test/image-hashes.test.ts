import type { DesignNode, ScreenModel } from "@fignya/model";
import { describe, expect, it } from "vitest";
import { imageHashes } from "../renderer/src/image-hashes";

const modelOf = (nodes: DesignNode[]): ScreenModel => ({ rootId: "s", nodes: new Map(nodes.map((n) => [n.id, n])) });

describe("imageHashes", () => {
  it("collects background, vector fill and instance override images once", () => {
    const nodes: DesignNode[] = [
      { id: "s", name: "s", kind: "frame", children: [], style: { background: [{ kind: "image", hash: "bg", fit: "cover" }] } },
      { id: "v", name: "v", kind: "vector", children: [], style: {}, paths: [{ d: "Z", fill: { hash: "vec", fit: "cover" }, rule: "nonzero" }, { d: "Z", fill: { r: 0, g: 0, b: 0, a: 1 }, rule: "nonzero" }] },
      {
        id: "i",
        name: "i",
        kind: "instance",
        componentId: "c",
        children: [],
        style: {},
        overrides: [
          { path: ["x"], paths: [{ d: "Z", fill: { hash: "swap", fit: "cover" }, rule: "nonzero" }] },
          { path: ["y"], style: { background: [{ kind: "image", hash: "bg", fit: "tile" }] } },
        ],
      },
    ];
    expect(imageHashes(modelOf(nodes))).toEqual(["bg", "vec", "swap"]);
  });
});
