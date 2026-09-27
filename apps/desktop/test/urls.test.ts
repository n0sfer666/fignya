import { describe, expect, it } from "vitest";
import { imageUrl, parseAssetUrl, thumbUrl } from "../shared/urls";

describe("asset urls", () => {
  it("round-trips screen ids with separators", () => {
    expect(parseAssetUrl(thumbUrl("12:345"))).toEqual({ kind: "thumb", id: "12:345", tier: 0.5 });
    expect(parseAssetUrl(imageUrl("0aff"))).toEqual({ kind: "image", id: "0aff" });
  });

  it("carries a sharper thumbnail tier and falls back to the base one", () => {
    expect(thumbUrl("1:2")).toBe("fignya://thumb/1%3A2");
    expect(parseAssetUrl(thumbUrl("1:2", 2))).toEqual({ kind: "thumb", id: "1:2", tier: 2 });
    expect(parseAssetUrl("fignya://thumb/1%3A2?tier=3")).toEqual({ kind: "thumb", id: "1:2", tier: 0.5 });
    expect(parseAssetUrl("fignya://thumb/1%3A2?tier=x")).toEqual({ kind: "thumb", id: "1:2", tier: 0.5 });
  });

  it("rejects foreign or malformed urls", () => {
    expect(parseAssetUrl("https://image/ab")).toBeUndefined();
    expect(parseAssetUrl("fignya://other/ab")).toBeUndefined();
    expect(parseAssetUrl("fignya://image/")).toBeUndefined();
    expect(parseAssetUrl("not a url")).toBeUndefined();
    expect(parseAssetUrl("fignya://image/%E0%A4%A")).toBeUndefined();
  });
});
