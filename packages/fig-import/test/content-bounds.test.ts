import { describe, expect, it } from "vitest";
import type { Screen } from "@fignya/model";
import { importDocument } from "../src/import-document";
import { box, figMessage, type FigSpec } from "./fixtures";

const page: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page" },
];

const screenOf = (specs: FigSpec[]): Screen | undefined => importDocument(figMessage([...page, ...specs])).pages[0]?.screens[0];

const open = { frameMaskDisabled: true };

describe("screen content bounds", () => {
  it("leaves a clipping screen at its frame", () => {
    const screen = screenOf([
      { id: 10, parent: 2, type: "FRAME", ...box(500, 0, 100, 100) },
      { id: 11, parent: 10, type: "RECTANGLE", ...box(0, 50, 10, 200) },
    ]);
    expect(screen).toEqual({ id: "1:10", name: "1:10", x: 500, y: 0, width: 100, height: 100 });
  });

  it("grows a non-clipping screen by children past its frame, in screen coordinates", () => {
    const screen = screenOf([
      { id: 10, parent: 2, type: "FRAME", ...open, ...box(500, 0, 100, 100) },
      { id: 11, parent: 10, type: "RECTANGLE", ...box(-20, 50, 10, 200) },
    ]);
    expect(screen?.content).toEqual({ x: -20, y: 0, width: 120, height: 250 });
  });

  it("omits content that fits the frame", () => {
    const screen = screenOf([
      { id: 10, parent: 2, type: "FRAME", ...open, ...box(0, 0, 100, 100) },
      { id: 11, parent: 10, type: "RECTANGLE", ...box(0, 0, 100, 100.001) },
    ]);
    expect(screen?.content).toBeUndefined();
  });

  it("skips hidden children", () => {
    const screen = screenOf([
      { id: 10, parent: 2, type: "FRAME", ...open, ...box(0, 0, 100, 100) },
      { id: 11, parent: 10, type: "RECTANGLE", visible: false, ...box(0, 0, 100, 900) },
    ]);
    expect(screen?.content).toBeUndefined();
  });

  it("follows nested open frames and stops at clipping ones", () => {
    const screen = screenOf([
      { id: 10, parent: 2, type: "FRAME", ...open, ...box(0, 0, 100, 100) },
      { id: 11, parent: 10, type: "FRAME", ...open, ...box(0, 80, 100, 20) },
      { id: 12, parent: 11, type: "TEXT", ...box(0, 10, 50, 40) },
      { id: 13, parent: 10, type: "FRAME", ...box(0, 0, 50, 50) },
      { id: 14, parent: 13, type: "RECTANGLE", ...box(0, 0, 10, 900) },
    ]);
    expect(screen?.content).toEqual({ x: 0, y: 0, width: 100, height: 130 });
  });

  it("takes rotated children by their transformed corners", () => {
    const screen = screenOf([
      { id: 10, parent: 2, type: "FRAME", ...open, ...box(0, 0, 100, 100) },
      { id: 11, parent: 10, type: "RECTANGLE", transform: { m00: 0, m01: -1, m02: 50, m10: 1, m11: 0, m12: 90 }, size: { x: 40, y: 10 } },
    ]);
    expect(screen?.content).toEqual({ x: 0, y: 0, width: 100, height: 130 });
  });

  it("skips slices and fully transparent children", () => {
    const screen = screenOf([
      { id: 10, parent: 2, type: "FRAME", ...open, ...box(0, 0, 100, 100) },
      { id: 11, parent: 10, type: "SLICE", ...box(0, 0, 100, 900) },
      { id: 12, parent: 10, type: "RECTANGLE", opacity: 0, ...box(0, 0, 900, 100) },
    ]);
    expect(screen?.content).toBeUndefined();
  });

  it("takes an open instance by its own box", () => {
    const screen = screenOf([
      { id: 10, parent: 2, type: "FRAME", ...open, ...box(0, 0, 100, 100) },
      { id: 11, parent: 10, type: "INSTANCE", ...open, ...box(0, 60, 100, 70) },
    ]);
    expect(screen?.content).toEqual({ x: 0, y: 0, width: 100, height: 130 });
  });

  it("caps the spill far past the frame", () => {
    const screen = screenOf([
      { id: 10, parent: 2, type: "FRAME", ...open, ...box(0, 0, 100, 100) },
      { id: 11, parent: 10, type: "RECTANGLE", ...box(-9000, 0, 9050, 20000) },
    ]);
    expect(screen?.content).toEqual({ x: -6000, y: 0, width: 6100, height: 6100 });
  });

  it("drops a layer wholly past the spill limit", () => {
    const screen = screenOf([
      { id: 10, parent: 2, type: "FRAME", ...open, ...box(0, 0, 100, 100) },
      { id: 11, parent: 10, type: "FRAME", ...open, ...box(0, 80, 100, 20) },
      { id: 12, parent: 11, type: "RECTANGLE", ...box(0, 20000, 10, 10) },
      { id: 13, parent: 10, type: "RECTANGLE", ...box(0, 50000, 10, 10) },
    ]);
    expect(screen?.content).toBeUndefined();
  });
});
