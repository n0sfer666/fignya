import { describe, expect, it } from "vitest";
import { parseFontCss } from "../main/font-css";

const face = (body: string): string => `/* cyrillic */\n@font-face {\n${body}\n}\n`;

const ROBOTO = face(`  font-family: 'Roboto';
  font-style: italic;
  font-weight: 500;
  font-stretch: 100%;
  src: url(https://fonts.gstatic.com/s/roboto/v51/KFOM.woff2) format('woff2');
  unicode-range: U+0301, U+0400-045F, U+04B0-04B1;`);

describe("parseFontCss", () => {
  it("reads every subset of a Google Fonts css2 answer", () => {
    expect(parseFontCss(ROBOTO + face("font-style: normal; font-weight: 400; src: url(https://fonts.gstatic.com/s/r/a.ttf) format('truetype');"))).toEqual([
      { weight: 500, italic: true, unicodeRange: "U+0301, U+0400-045F, U+04B0-04B1", url: "https://fonts.gstatic.com/s/roboto/v51/KFOM.woff2", format: "woff2" },
      { weight: 400, italic: false, url: "https://fonts.gstatic.com/s/r/a.ttf", format: "truetype" },
    ]);
  });

  it("drops faces from foreign hosts or with unsafe values", () => {
    expect(parseFontCss(face("font-weight: 400; src: url(https://evil.example/a.woff2) format('woff2');"))).toEqual([]);
    expect(parseFontCss(face("font-weight: bold; src: url(https://fonts.gstatic.com/a.woff2) format('woff2');"))).toEqual([]);
    expect(parseFontCss(face("font-weight: 400; src: url(https://fonts.gstatic.com/a.woff2) format('woff2'); unicode-range: U+0-7F url(x)"))).toEqual([]);
    expect(parseFontCss("<html>400: Missing font family</html>")).toEqual([]);
  });
});
