import { describe, expect, it } from "vitest";
import { imageUrl, parseAssetUrl, thumbUrl } from "../shared/urls";

describe("asset urls", () => {
  it("round-trips screen ids with separators", () => {
    expect(parseAssetUrl(thumbUrl("12:345"))).toEqual({ kind: "thumb", id: "12:345" });
    expect(parseAssetUrl(imageUrl("0aff"))).toEqual({ kind: "image", id: "0aff" });
  });

  it("rejects foreign or malformed urls", () => {
    expect(parseAssetUrl("https://image/ab")).toBeUndefined();
    expect(parseAssetUrl("fignya://other/ab")).toBeUndefined();
    expect(parseAssetUrl("fignya://image/")).toBeUndefined();
    expect(parseAssetUrl("not a url")).toBeUndefined();
    expect(parseAssetUrl("fignya://image/%E0%A4%A")).toBeUndefined();
  });
});
