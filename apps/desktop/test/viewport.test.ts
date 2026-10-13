import { describe, expect, it } from "vitest";
import { boundsOf, fitView, MAX_ZOOM, panBy, toWorld, zoomAround, zoomStep } from "../renderer/src/canvas/viewport";

const screen = (x: number, y: number, width: number, height: number) => ({ id: `${x}`, name: "s", x, y, width, height });

describe("viewport", () => {
  it("computes page bounds", () => {
    expect(boundsOf([screen(10, 20, 100, 50), screen(200, -10, 50, 50)])).toEqual({ x: 10, y: -10, width: 240, height: 80 });
    expect(boundsOf([])).toBeUndefined();
  });

  it("includes content painted past a screen's frame", () => {
    const open = { ...screen(10, 20, 100, 50), content: { x: -5, y: 0, width: 105, height: 300 } };
    expect(boundsOf([open, screen(200, -10, 50, 50)])).toEqual({ x: 5, y: -10, width: 245, height: 330 });
  });

  it("fits bounds centered without upscaling", () => {
    expect(fitView({ x: 0, y: 0, width: 1000, height: 500 }, 520, 520, 10)).toEqual({ zoom: 0.5, x: 10, y: 135 });
    expect(fitView({ x: 100, y: 100, width: 10, height: 10 }, 100, 100, 0).zoom).toBe(1);
  });

  it("zooms around a point keeping it fixed", () => {
    const view = { x: 10, y: 20, zoom: 1 };
    const next = zoomAround(view, 2, 110, 120);
    expect(toWorld(next, 110, 120)).toEqual(toWorld(view, 110, 120));
    expect(zoomAround(view, 1000, 0, 0).zoom).toBe(MAX_ZOOM);
  });

  it("steps zoom around a point: in doubles, out halves, actual returns to 100%", () => {
    const view = { x: 10, y: 20, zoom: 0.3 };
    expect(zoomStep(view, "in", 50, 60).zoom).toBeCloseTo(0.6);
    expect(zoomStep(view, "out", 50, 60).zoom).toBeCloseTo(0.15);
    expect(zoomStep(view, "actual", 50, 60).zoom).toBeCloseTo(1);
    expect(toWorld(zoomStep(view, "actual", 50, 60), 50, 60).x).toBeCloseTo(toWorld(view, 50, 60).x);
    expect(zoomStep({ x: 0, y: 0, zoom: MAX_ZOOM }, "in", 0, 0).zoom).toBe(MAX_ZOOM);
  });

  it("pans by screen delta", () => {
    expect(panBy({ x: 1, y: 2, zoom: 3 }, 4, 5)).toEqual({ x: 5, y: 7, zoom: 3 });
  });
});
