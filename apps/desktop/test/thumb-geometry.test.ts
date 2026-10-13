import { describe, expect, it } from "vitest";
import { thumbGeometry } from "../main/thumb-geometry";

const screen = { id: "1:1", name: "s", x: 500, y: 0, width: 1440, height: 1024 };

describe("thumbnail geometry", () => {
  it("draws the frame from its corner", () => {
    expect(thumbGeometry(screen, 0.5)).toEqual({ scale: 0.5, origin: { x: 0, y: 0 }, width: 720, height: 512 });
  });

  it("draws the content box past the frame", () => {
    const spilled = { ...screen, content: { x: -20, y: 0, width: 1460, height: 1088 } };
    expect(thumbGeometry(spilled, 0.5)).toEqual({ scale: 0.5, origin: { x: -20, y: 0 }, width: 730, height: 544 });
  });

  it("scales a tall content box to the side limit", () => {
    const tall = { ...screen, content: { x: 0, y: 0, width: 1024, height: 8192 } };
    expect(thumbGeometry(tall, 2)).toEqual({ scale: 0.5, origin: { x: 0, y: 0 }, width: 512, height: 4096 });
  });
});
