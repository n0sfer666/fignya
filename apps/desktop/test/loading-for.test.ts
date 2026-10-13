import { describe, expect, it } from "vitest";
import { loadingFor } from "../renderer/src/canvas/loading-for";

describe("loadingFor", () => {
  it("loads thumbnails eagerly while the window is hidden, where lazy images never start", () => {
    expect(loadingFor("hidden")).toBe("eager");
  });

  it("keeps lazy loading in a visible window", () => {
    expect(loadingFor("visible")).toBe("lazy");
  });
});
