import { describe, expect, it } from "vitest";
import { fontFaceRule } from "../shared/font-face-css";

describe("fontFaceRule", () => {
  it("declares each stored face through the asset protocol", () => {
    expect(fontFaceRule({ family: "IBM Plex Mono", weight: 500, italic: true, unicodeRange: "U+0400-045F, U+0490", file: "ab.woff2" })).toBe(
      "@font-face{font-family:'IBM Plex Mono';font-style:italic;font-weight:500;src:url('fignya://font/ab.woff2');unicode-range:U+0400-045F, U+0490;font-display:block}",
    );
  });

  it("escapes family names taken from the document", () => {
    expect(fontFaceRule({ family: "A'}*{x", weight: 400, italic: false, file: "ab.woff2" })).toContain("font-family:'A\\'}*{x';font-style:normal");
  });
});
