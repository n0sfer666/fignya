import { describe, expect, it } from "vitest";
import { contentClip } from "../renderer/src/canvas/content-clip";

const screen = { id: "1:1", name: "s", x: 500, y: 0, width: 100, height: 50 };

describe("live screen clip", () => {
  it("clips to the frame without content", () => {
    expect(contentClip(screen)).toBe("polygon(0px 0px,100px 0px,100px 50px,0px 50px)");
  });

  it("clips to the content box past the frame", () => {
    expect(contentClip({ ...screen, content: { x: -20, y: 0, width: 120, height: 90 } })).toBe("polygon(-20px 0px,100px 0px,100px 90px,-20px 90px)");
  });
});
