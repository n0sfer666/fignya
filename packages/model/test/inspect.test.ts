import { describe, expect, it } from "vitest";
import { inspect, type Color, type DesignNode } from "../src";

const red: Color = { r: 255, g: 0, b: 0, a: 1 };
const url = (hash: string): string => `img://${hash}`;

const frame: DesignNode = {
  id: "1:2",
  name: "Card",
  kind: "frame",
  children: [],
  style: {
    position: "absolute",
    left: 4,
    top: 8,
    width: 120,
    height: 40,
    display: "flex",
    flexDirection: "row",
    gap: 8,
    padding: [0, 16, 0, 16],
    alignItems: "center",
    borderRadius: [6, 6, 6, 6],
    opacity: 0.5,
    background: [{ kind: "solid", color: red }],
    outline: { width: 1, color: red },
    boxShadow: [{ inset: false, x: 0, y: 2, blur: 4, spread: 0, color: red }],
  },
};

describe("inspect", () => {
  it("describes the layer and groups its CSS by section in a fixed order", () => {
    const { layer, sections } = inspect(frame, undefined, url);
    expect(layer).toEqual([
      ["id", "1:2"],
      ["name", "Card"],
      ["type", "frame"],
    ]);
    expect(sections).toEqual([
      {
        title: "Layout",
        rows: [
          ["position", "absolute"],
          ["left", "4px"],
          ["top", "8px"],
          ["display", "flex"],
          ["flex-direction", "row"],
          ["gap", "8px"],
          ["padding", "0px 16px 0px 16px"],
          ["align-items", "center"],
        ],
      },
      {
        title: "Size",
        rows: [
          ["width", "120px"],
          ["height", "40px"],
        ],
      },
      {
        title: "Appearance",
        rows: [
          ["border-radius", "6px 6px 6px 6px"],
          ["opacity", "0.5"],
        ],
      },
      { title: "Fill", rows: [["background-color", "rgba(255,0,0,1)"]] },
      { title: "Stroke", rows: [["outline", "1px solid rgba(255,0,0,1)"]] },
      { title: "Effects", rows: [["box-shadow", "0px 2px 4px 0px rgba(255,0,0,1)"]] },
    ]);
  });

  it("puts text styles under Typography and keeps overflow apart from overflow-wrap", () => {
    const text: DesignNode = {
      id: "3:4",
      name: "Label",
      kind: "text",
      children: [],
      text: "Hi",
      style: { overflow: "hidden", color: red, fontFamily: "Inter", fontSize: 14, lineHeight: 20, textAlign: "center", overflowWrap: "break-word", lineClamp: 2 },
    };
    const { sections } = inspect(text, undefined, url);
    expect(sections.map((s) => s.title)).toEqual(["Appearance", "Typography"]);
    expect(sections[1]?.rows.map(([name]) => name)).toEqual([
      "color",
      "font-family",
      "font-size",
      "line-height",
      "text-align",
      "overflow-wrap",
      "-webkit-box-orient",
      "-webkit-line-clamp",
    ]);
  });

  it("names the component of an instance, or its id when the component is not loaded", () => {
    const instance: DesignNode = { id: "5:6", name: "Button", kind: "instance", children: [], style: {}, componentId: "7:8", overrides: [] };
    const component: DesignNode = { id: "7:8", name: "Button/Primary", kind: "component", children: [], style: {} };
    expect(inspect(instance, component, url).layer.at(-1)).toEqual(["component", "Button/Primary (7:8)"]);
    expect(inspect(instance, undefined, url).layer.at(-1)).toEqual(["component", "7:8"]);
    expect(inspect(instance, undefined, url).sections).toEqual([]);
  });

  it("serializes image fills with the given url", () => {
    const image: DesignNode = { ...frame, style: { background: [{ kind: "image", hash: "ab", fit: "cover" }] } };
    const fill = inspect(image, undefined, url).sections[0];
    expect(fill?.title).toBe("Fill");
    expect(fill?.rows.find(([name]) => name === "background-image")?.[1]).toContain("img://ab");
  });

  it("shows a negative gap that the rendered CSS replaces with margins", () => {
    const overlap: DesignNode = { ...frame, style: { display: "flex", gap: -8 } };
    expect(inspect(overlap, undefined, url).sections).toEqual([
      {
        title: "Layout",
        rows: [
          ["display", "flex"],
          ["gap", "-8px"],
        ],
      },
    ]);
  });
});
