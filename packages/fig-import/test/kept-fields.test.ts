import { describe, expect, it } from "vitest";
import type { Rec } from "../src/fig/guards";
import { recs } from "../src/fig/guards";
import { slimNode } from "../src/fig/kept-fields";
import { importDocument } from "../src/import-document";
import { box, figMessage, guid, solid, type FigSpec } from "./fixtures";

const noise = { derivedSymbolData: [{ guidPath: { guids: [guid(31)] }, size: { x: 1, y: 1 }, fillGeometry: [{}] }], exportSettings: [{}], variableConsumptionMap: {} };

const lines = [{ lineType: "PLAIN" }];

const assignment = (def: number, value: Rec): Rec => ({ defID: guid(def), value, varValue: { value } });

const symbolOverrides = [
  { guidPath: { guids: [guid(131)] }, styleIdForFill: {}, fillPaints: [solid(0, 1, 0)], fontSize: 30, textData: { characters: "Over", lines } },
  { guidPath: { guids: [guid(33)] }, componentPropAssignments: [assignment(8, { textValue: { characters: "Prop", lines } })] },
];

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
  {
    id: 12, parent: 10, position: "b", type: "INSTANCE", name: "Button", ...box(3, 4, 10, 10), ...noise, cornerRadius: 6, stackPositioning: "ABSOLUTE",
    symbolData: { symbolID: guid(30), symbolOverrides }, componentPropAssignments: [assignment(7, { boolValue: false })],
  },
  { id: 13, parent: 10, position: "c", type: "VECTOR", name: "Icon", ...box(0, 0, 5, 5), ...noise, visible: false, fillPaints: [solid(0, 0, 0)], fillGeometry: [{ commandsBlob: 0, windingRule: "ODD" }], strokePaints: [solid(0, 0, 0)], strokeGeometry: [{ commandsBlob: 0 }] },
  { id: 30, parent: 3, position: "a", type: "SYMBOL", name: "C", ...box(0, 0, 10, 10), ...noise },
  { id: 31, parent: 30, position: "a", type: "TEXT", name: "L", overrideKey: guid(131), textData: { characters: "Base" }, fontSize: 12, ...box(0, 0, 5, 5) },
  { id: 32, parent: 30, position: "b", type: "FRAME", name: "Opt", componentPropRefs: [{ defID: guid(7), componentPropNodeField: "VISIBLE" }], ...box(0, 0, 5, 5) },
  { id: 33, parent: 30, position: "c", type: "INSTANCE", name: "Nested", symbolData: { symbolID: guid(40) }, ...box(0, 0, 5, 5) },
  { id: 40, parent: 3, position: "b", type: "SYMBOL", name: "D", ...box(0, 0, 5, 5) },
  { id: 41, parent: 40, position: "a", type: "TEXT", name: "N", textData: { characters: "Inner" }, componentPropRefs: [{ defID: guid(8), componentPropNodeField: "TEXT_DATA" }], ...box(0, 0, 5, 5) },
];

const message = figMessage(specs, [new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0])]);
const slimmed: Rec = { ...message, nodeChanges: recs(message, "nodeChanges").map(slimNode) };

describe("slimNode", () => {
  it("keeps every field the converter reads", () => {
    expect(importDocument(slimmed)).toEqual(importDocument(message));
  });

  it("applies overrides, props and derived sizes after slimming", () => {
    const [instance] = [...importDocument(slimmed).nodes.values()].filter((n) => n.id === "1:12");
    expect(instance?.kind === "instance" ? instance.overrides.map((o) => o.path) : []).toEqual([["1:32"], ["1:31"], ["1:33", "1:41"]]);
  });

  it("slims override, prop and derived data", () => {
    const [, , , screen, text, instance] = recs(slimmed, "nodeChanges");
    expect(screen?.derivedSymbolData).toEqual([{ guidPath: { guids: [guid(31)] }, size: { x: 1, y: 1 } }]);
    expect(screen).not.toHaveProperty("variableConsumptionMap");
    expect(text?.textData).toEqual({ characters: "Hi" });
    expect(instance?.symbolData).toEqual({
      symbolID: guid(30),
      symbolOverrides: [
        { guidPath: { guids: [guid(131)] }, fillPaints: [solid(0, 1, 0)], fontSize: 30, textData: { characters: "Over" } },
        { guidPath: { guids: [guid(33)] }, componentPropAssignments: [{ defID: guid(8), value: { textValue: { characters: "Prop" } }, varValue: { value: {} } }] },
      ],
    });
    expect(instance?.componentPropAssignments).toEqual([{ defID: guid(7), value: { boolValue: false }, varValue: { value: { boolValue: false } } }]);
  });
});
