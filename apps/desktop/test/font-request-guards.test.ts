import { describe, expect, it } from "vitest";
import { isFontRequests } from "../main/font-request-guards";

describe("isFontRequests", () => {
  it("accepts families with their faces", () => {
    expect(isFontRequests([{ family: "Roboto", faces: [{ weight: 400, italic: false }, { weight: 700, italic: true }] }])).toBe(true);
    expect(isFontRequests([])).toBe(true);
  });

  it("rejects malformed requests from the renderer", () => {
    expect(isFontRequests({ family: "Roboto" })).toBe(false);
    expect(isFontRequests([{ family: " ", faces: [{ weight: 400, italic: false }] }])).toBe(false);
    expect(isFontRequests([{ family: "Roboto", faces: [] }])).toBe(false);
    expect(isFontRequests([{ family: "Roboto", faces: [{ weight: 450.5, italic: false }] }])).toBe(false);
    expect(isFontRequests([{ family: "Roboto", faces: [{ weight: 400, italic: "no" }] }])).toBe(false);
    expect(isFontRequests([{ family: "x".repeat(200), faces: [{ weight: 400, italic: false }] }])).toBe(false);
  });
});
