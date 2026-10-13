import { describe, expect, it } from "vitest";
import type { Override } from "@fignya/model";
import { rec, recs, type Rec } from "../src/fig/guards";
import { importDocument } from "../src/import-document";
import { withSharedStyles } from "../src/tree/shared-styles";
import { box, figMessage, figNode, guid, solid, type FigSpec } from "./fixtures";

const path = (...ids: number[]): Rec => ({ guidPath: { guids: ids.map(guid) } });

const green = solid(0, 1, 0);

const shadow = { type: "DROP_SHADOW", visible: true, radius: 4, offset: { x: 0, y: 2 }, color: { r: 0, g: 0, b: 0, a: 0.25 } };

const detached = { guid: { sessionID: 4294967295, localID: 4294967295 } };

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page" },
  { id: 3, parent: 1, position: "b", type: "CANVAS", name: "Internal Only Canvas" },
  { id: 5, parent: 3, position: "z", type: "RECTANGLE", name: "Fill style", styleType: "FILL", key: "fill-key", fillPaints: [green] },
  { id: 6, parent: 3, position: "y", type: "TEXT", name: "Text style", styleType: "TEXT", fontSize: 18, textCase: "UPPER" },
  { id: 7, parent: 3, position: "x", type: "RECTANGLE", name: "Effect style", styleType: "EFFECT", key: "fx", fillPaints: [green], effects: [shadow] },
  { id: 11, parent: 10, position: "b", type: "RECTANGLE", name: "Detached", styleIdForFill: detached, fillPaints: [solid(1, 0, 0)], ...box(0, 0, 5, 5) },
  { id: 10, parent: 2, position: "a", type: "FRAME", name: "Screen", ...box(0, 0, 375, 800) },
  {
    id: 20, parent: 10, position: "a", type: "INSTANCE", name: "I", ...box(0, 0, 100, 100),
    symbolData: {
      symbolID: guid(30),
      symbolOverrides: [
        { ...path(35), styleIdForFill: { assetRef: { key: "fill-key" } }, fillPaints: [] },
        { ...path(31), styleIdForText: { assetRef: { key: "" }, guid: guid(6) }, fontSize: 24 },
        { ...path(36), styleIdForStrokeFill: { guid: guid(5) }, styleIdForEffect: { assetRef: { key: "fx" } } },
      ],
    },
    styleIdForFill: { guid: guid(5) },
    derivedSymbolData: [{ ...path(36), strokeGeometry: [{ commandsBlob: 0, windingRule: "ODD" }] }],
  },
  { id: 30, parent: 3, position: "a", type: "SYMBOL", name: "C", ...box(0, 0, 100, 100) },
  { id: 31, parent: 30, position: "a", type: "TEXT", name: "L", textData: { characters: "Label" }, fontSize: 12, ...box(0, 0, 50, 20) },
  { id: 35, parent: 30, position: "b", type: "VECTOR", name: "Icon", fillPaints: [solid(1, 0, 0)], fillGeometry: [{ commandsBlob: 0 }], ...box(0, 0, 5, 5) },
  { id: 36, parent: 30, position: "c", type: "VECTOR", name: "Moon", strokePaints: [solid(0, 0, 1)], ...box(0, 0, 5, 5) },
];

const message = figMessage(specs, [new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0])]);

const overridesOf = (id: string): Override[] => {
  const node = importDocument(message).nodes.get(id);
  return node?.kind === "instance" ? node.overrides : [];
};

const at = (list: Override[], id: string): Override | undefined => list.find((o) => o.path.join("/") === id);

describe("withSharedStyles", () => {
  const nodes = specs.map(figNode);
  const instance = withSharedStyles(nodes).find((n) => n.name === "I");
  const overrides = recs(instance && rec(instance, "symbolData"), "symbolOverrides");

  it("fills values from styles referenced by asset key and by guid", () => {
    expect(overrides[0]?.fillPaints).toEqual([green]);
    expect(overrides[1]).toMatchObject({ textCase: "UPPER" });
  });

  it("fills the node's own fields from its style", () => {
    expect(withSharedStyles(nodes).find((n) => n.name === "I")?.fillPaints).toEqual([green]);
  });

  it("replaces stale inline values with the style's", () => {
    expect(overrides[1]?.fontSize).toBe(18);
  });

  it("paints strokes from a fill style and effects from an effect style", () => {
    expect(overrides[2]).toMatchObject({ strokePaints: [green], effects: [shadow] });
    expect(overrides[2]).not.toHaveProperty("fillPaints");
  });

  it("keeps inline values when the style is detached", () => {
    const node = nodes.find((n) => n.name === "Detached");
    expect(withSharedStyles(nodes).find((n) => n.name === "Detached")).toBe(node);
  });

  it("returns the same nodes when the file has no styles", () => {
    const plain = nodes.filter((n) => n.styleType === undefined);
    expect(withSharedStyles(plain)).toBe(plain);
  });
});

describe("shared styles in instance overrides", () => {
  const list = overridesOf("1:20");

  it("recolors a vector through a fill style reference", () => {
    expect(at(list, "1:35")?.paths?.[0]?.fill).toEqual({ r: 0, g: 255, b: 0, a: 1 });
  });

  it("applies text style fields over stale inline values", () => {
    expect(at(list, "1:31")?.style).toMatchObject({ fontSize: 18, textTransform: "uppercase" });
  });

  it("draws instance vectors from derived stroke geometry in the stroke style color", () => {
    expect(at(list, "1:36")?.paths).toEqual([{ d: "M0 0", fill: { r: 0, g: 255, b: 0, a: 1 }, rule: "evenodd" }]);
  });
});
