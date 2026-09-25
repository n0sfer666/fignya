import { describe, expect, it } from "vitest";
import { cssText, type Color } from "../src";

const red: Color = { r: 255, g: 0, b: 0, a: 1 };
const url = (hash: string): string => `img://${hash}`;

describe("cssText", () => {
  it("returns empty string for empty style", () => {
    expect(cssText({}, url)).toBe("");
  });

  it("serializes box geometry with rounded px", () => {
    expect(cssText({ position: "absolute", left: 10.126, top: 0, width: 100, height: 50.5 }, url)).toBe(
      "position:absolute;left:10.13px;top:0px;width:100px;height:50.5px",
    );
  });

  it("serializes flex container", () => {
    const css = cssText(
      { display: "flex", flexDirection: "column", gap: 8, padding: [1, 2, 3, 4], justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" },
      url,
    );
    expect(css).toBe("display:flex;flex-direction:column;flex-wrap:wrap;gap:8px;padding:1px 2px 3px 4px;justify-content:space-between;align-items:center");
  });

  it("serializes flex child", () => {
    expect(cssText({ flexGrow: 1, flexShrink: 1, flexBasis: 0, alignSelf: "stretch", minWidth: 0 }, url)).toBe(
      "min-width:0px;align-self:stretch;flex-grow:1;flex-shrink:1;flex-basis:0px",
    );
  });

  it("serializes rotation matrix with origin", () => {
    expect(cssText({ transform: [0, 1, -1, 0] }, url)).toBe("transform:matrix(0,1,-1,0,0,0);transform-origin:0 0");
  });

  it("serializes border radius as sides or ellipse", () => {
    expect(cssText({ borderRadius: [4, 4, 0, 0] }, url)).toBe("border-radius:4px 4px 0px 0px");
    expect(cssText({ borderRadius: "50%" }, url)).toBe("border-radius:50%");
  });

  it("serializes single solid paint as background-color", () => {
    expect(cssText({ background: [{ kind: "solid", color: { r: 0, g: 128, b: 255, a: 0.5 } }] }, url)).toBe(
      "background-color:rgba(0,128,255,0.5)",
    );
  });

  it("serializes paint layers top-first with sizes", () => {
    const css = cssText(
      {
        background: [
          { kind: "image", hash: "ab", fit: "contain" },
          { kind: "linear", angle: 90, stops: [{ color: red, position: 0 }, { color: red, position: 1 }] },
          { kind: "solid", color: red },
        ],
      },
      url,
    );
    expect(css).toBe(
      [
        "background-image:url(img://ab),linear-gradient(90deg,rgba(255,0,0,1) 0%,rgba(255,0,0,1) 100%),linear-gradient(rgba(255,0,0,1),rgba(255,0,0,1))",
        "background-size:contain,100% 100%,100% 100%",
        "background-position:center",
        "background-repeat:no-repeat,no-repeat,no-repeat",
      ].join(";"),
    );
  });

  it("serializes radial gradient and tiled image", () => {
    const css = cssText(
      { background: [{ kind: "radial", stops: [{ color: red, position: 0.5 }] }, { kind: "image", hash: "cd", fit: "tile" }] },
      url,
    );
    expect(css).toContain("background-image:radial-gradient(rgba(255,0,0,1) 50%),url(img://cd)");
    expect(css).toContain("background-size:100% 100%,auto");
    expect(css).toContain("background-repeat:no-repeat,repeat");
  });

  it("serializes decorations", () => {
    const css = cssText(
      {
        outline: { width: 2, color: red },
        boxShadow: [
          { inset: true, x: 0, y: 0, blur: 0, spread: 1, color: red },
          { inset: false, x: 0, y: 4, blur: 8, spread: 0, color: red },
        ],
        filterBlur: 2,
        backdropBlur: 5,
        opacity: 0.25,
        overflow: "hidden",
      },
      url,
    );
    expect(css).toBe(
      [
        "outline:2px solid rgba(255,0,0,1)",
        "box-shadow:inset 0px 0px 0px 1px rgba(255,0,0,1),0px 4px 8px 0px rgba(255,0,0,1)",
        "filter:blur(2px)",
        "backdrop-filter:blur(5px)",
        "opacity:0.25",
        "overflow:hidden",
      ].join(";"),
    );
  });

  it("serializes text", () => {
    const css = cssText(
      {
        color: red,
        fontFamily: "Inter",
        fontSize: 14,
        fontWeight: 600,
        fontStyle: "italic",
        lineHeight: 20,
        letterSpacing: { value: -0.01, unit: "em" },
        textAlign: "center",
      },
      url,
    );
    expect(css).toBe(
      "color:rgba(255,0,0,1);font-family:'Inter',sans-serif;font-size:14px;font-weight:600;font-style:italic;line-height:20px;letter-spacing:-0.01em;text-align:center",
    );
  });

  it("escapes font family and serializes wrapping", () => {
    expect(cssText({ fontFamily: "O'Brien\\\nX", whiteSpace: "pre-wrap", overflowWrap: "break-word" }, url)).toBe(
      "font-family:'O\\'Brien\\\\ X',sans-serif;white-space:pre-wrap;overflow-wrap:break-word",
    );
  });

  it("serializes truncation and line clamp", () => {
    expect(cssText({ whiteSpace: "pre", overflow: "hidden", textOverflow: "ellipsis" }, url)).toBe("overflow:hidden;white-space:pre;text-overflow:ellipsis");
    expect(cssText({ display: "-webkit-box", lineClamp: 2 }, url)).toBe("display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2");
  });

  it("serializes normal line height", () => {
    expect(cssText({ lineHeight: "normal" }, url)).toBe("line-height:normal");
  });
});
