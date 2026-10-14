import { describe, expect, it, vi } from "vitest";
import { SHOT_EDGE, shotGeometry, takeShot } from "../main/thumb-shot";
import type { ThumbRenderer } from "../main/thumb-renderer";

describe("shotGeometry", () => {
  it("fits the long side into the edge limit", () => {
    expect(shotGeometry({ x: 0, y: 0, width: 1440, height: 4000 })).toEqual({ scale: SHOT_EDGE / 4000, width: 565, height: SHOT_EDGE });
  });

  it("doubles small nodes but never past the limit", () => {
    expect(shotGeometry({ x: 5, y: 5, width: 20, height: 10 })).toEqual({ scale: 2, width: 40, height: 20 });
    expect(shotGeometry({ x: 0, y: 0, width: 0, height: 0 })).toEqual({ scale: 2, width: 1, height: 1 });
  });

  it("refuses a node smaller than a pixel without drawing", async () => {
    const screen = { id: "1:1", name: "s", x: 0, y: 0, width: 100, height: 100 };
    const doc = { screen: async () => ({ rootId: "1:1", nodes: new Map() }) };
    const draw = vi.fn<ThumbRenderer["draw"]>();
    const measure = vi.fn<ThumbRenderer["measure"]>(async () => ({ x: 10, y: 10, width: 0.5, height: 20 }));
    await expect(takeShot(doc, screen, ["1:2"], { draw, measure })).rejects.toThrow("the node is not visible or has zero size");
    expect(draw).not.toHaveBeenCalled();
  });
});
