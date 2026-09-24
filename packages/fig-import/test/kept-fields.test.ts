import { describe, expect, it } from "vitest";
import type { Rec } from "../src/fig/guards";
import { recs } from "../src/fig/guards";
import { slimNode } from "../src/fig/kept-fields";
import { importDocument } from "../src/import-document";
import { box, figMessage, guid, solid, type FigSpec } from "./fixtures";

const noise = { derivedSymbolData: [{ size: { x: 1, y: 1 } }], symbolOverrides: [{ guidPath: {} }], exportSettings: [{}] };

const stops = [
  { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
  { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
];

const effects = [
  { type: "DROP_SHADOW", radius: 8, spread: 1, offset: { x: 0, y: 4 }, color: { r: 0, g: 0, b: 0, a: 0.5 } },
  { type: "LAYER_BLUR", radius: 10 },
];

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page" },
  { id: 3, parent: 1, position: "b", type: "CANVAS", name: "Internal Only Canvas" },
  {
    id: 10, parent: 2, position: "a", type: "FRAME", name: "Screen", ...box(0, 0, 375, 800), ...noise,
    opacity: 0.9, stackMode: "VERTICAL", stackWrap: "WRAP", stackSpacing: 8, stackHorizontalPadding: 16, stackVerticalPadding: 4,
    stackPaddingRight: 12, stackPaddingBottom: 6, stackPrimaryAlignItems: "SPACE_BETWEEN", stackCounterAlignItems: "CENTER",
    cornerRadius: 8, rectangleTopLeftCornerRadius: 1, rectangleTopRightCornerRadius: 2, rectangleBottomRightCornerRadius: 3,
    rectangleBottomLeftCornerRadius: 4, frameMaskDisabled: true, effects,
    fillPaints: [{ type: "GRADIENT_LINEAR", stops, transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 } }, { type: "IMAGE", image: { hash: new Uint8Array([10, 255]) }, imageScaleMode: "FIT" }],
    strokePaints: [solid(0, 0, 0)], strokeWeight: 2, strokeAlign: "OUTSIDE",
  },
  {
    id: 11, parent: 10, position: "a", type: "TEXT", name: "Label", ...box(5, 7, 100, 20), ...noise,
    textData: { characters: "Hi", lines: [{ lineType: "PLAIN" }], glyphs: [{}] }, derivedTextData: { layoutSize: { x: 1, y: 1 } },
    fontName: { family: "Roboto", style: "Semi Bold Italic" }, fontSize: 20, lineHeight: { value: 150, units: "PERCENT" },
    letterSpacing: { value: -2, units: "PERCENT" }, textAlignHorizontal: "CENTER", fillPaints: [solid(1, 0, 0)],
    stackChildPrimaryGrow: 1, stackChildAlignSelf: "STRETCH",
  },
  { id: 12, parent: 10, position: "b", type: "INSTANCE", name: "Button", ...box(3, 4, 10, 10), ...noise, cornerRadius: 6, symbolData: { symbolID: guid(30), symbolOverrides: [{}] }, stackPositioning: "ABSOLUTE" },
  { id: 13, parent: 10, position: "c", type: "VECTOR", name: "Icon", ...box(0, 0, 5, 5), ...noise, visible: false, fillPaints: [solid(0, 0, 0)], fillGeometry: [{ commandsBlob: 0, windingRule: "ODD" }], strokePaints: [solid(0, 0, 0)], strokeGeometry: [{ commandsBlob: 0 }] },
  { id: 30, parent: 3, position: "a", type: "SYMBOL", name: "C", ...box(0, 0, 10, 10), ...noise },
];

const message = figMessage(specs, [new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0])]);
const slimmed: Rec = { ...message, nodeChanges: recs(message, "nodeChanges").map(slimNode) };

describe("slimNode", () => {
  it("keeps every field the converter reads", () => {
    expect(importDocument(slimmed)).toEqual(importDocument(message));
  });

  it("drops derived and override data", () => {
    const [, , , screen, text, instance] = recs(slimmed, "nodeChanges");
    expect(screen).not.toHaveProperty("derivedSymbolData");
    expect(text?.textData).toEqual({ characters: "Hi" });
    expect(instance?.symbolData).toEqual({ symbolID: guid(30) });
  });
});
