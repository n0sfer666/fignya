import { describe, expect, it } from "vitest";
import { firstSolid, paintsOf } from "../src/convert/paint";
import { solid } from "./fixtures";

describe("paintsOf", () => {
  it("converts colors to 0-255 with paint opacity", () => {
    expect(paintsOf({ fillPaints: [solid(1, 0.5, 0, { opacity: 0.5 })] }, "fillPaints")).toEqual([
      { kind: "solid", color: { r: 255, g: 128, b: 0, a: 0.5 } },
    ]);
  });

  it("skips hidden and transparent paints", () => {
    const raw = { fillPaints: [solid(1, 1, 1, { visible: false }), solid(0, 0, 0, { opacity: 0 })] };
    expect(paintsOf(raw, "fillPaints")).toEqual([]);
  });

  it("orders layers top-first", () => {
    const raw = { fillPaints: [solid(1, 0, 0), solid(0, 0, 1)] };
    expect(paintsOf(raw, "fillPaints").map((p) => (p.kind === "solid" ? p.color.b : -1))).toEqual([255, 0]);
  });

  it("converts linear gradient angle and stops", () => {
    const paint = {
      type: "GRADIENT_LINEAR",
      transform: { m00: 1, m10: 0 },
      stops: [{ color: { r: 0, g: 0, b: 0, a: 1 }, position: 0 }, { color: { r: 1, g: 1, b: 1, a: 1 }, position: 1 }],
    };
    expect(paintsOf({ fillPaints: [paint] }, "fillPaints")).toEqual([
      {
        kind: "linear",
        angle: 90,
        stops: [{ color: { r: 0, g: 0, b: 0, a: 1 }, position: 0 }, { color: { r: 255, g: 255, b: 255, a: 1 }, position: 1 }],
      },
    ]);
  });

  it("treats other gradients as radial", () => {
    const stop = (position: number): { color: { r: number; g: number; b: number; a: number }; position: number } => ({ color: { r: 0, g: 0, b: 0, a: 1 }, position });
    expect(paintsOf({ fillPaints: [{ type: "GRADIENT_RADIAL", stops: [stop(0), stop(1)] }] }, "fillPaints")).toEqual([
      { kind: "radial", stops: [{ color: { r: 0, g: 0, b: 0, a: 1 }, position: 0 }, { color: { r: 0, g: 0, b: 0, a: 1 }, position: 1 }] },
    ]);
  });

  it("drops gradients with fewer than two stops", () => {
    expect(paintsOf({ fillPaints: [{ type: "GRADIENT_RADIAL", stops: [] }, { type: "GRADIENT_LINEAR", stops: [{ position: 0 }] }] }, "fillPaints")).toEqual([]);
  });

  it("converts image hash to hex with fit", () => {
    const paint = { type: "IMAGE", image: { hash: new Uint8Array([0x0a, 0xff]) }, imageScaleMode: "FIT" };
    expect(paintsOf({ fillPaints: [paint] }, "fillPaints")).toEqual([{ kind: "image", hash: "0aff", fit: "contain" }]);
  });

  it("drops images without hash", () => {
    expect(paintsOf({ fillPaints: [{ type: "IMAGE" }] }, "fillPaints")).toEqual([]);
  });
});

describe("firstSolid", () => {
  it("returns the first visible solid color", () => {
    expect(firstSolid({ strokePaints: [{ type: "IMAGE" }, solid(0, 0, 1)] }, "strokePaints")).toEqual({ r: 0, g: 0, b: 255, a: 1 });
    expect(firstSolid({}, "strokePaints")).toBeUndefined();
  });
});
