import { describe, expect, it } from "vitest";
import type { DesignNode, Override } from "@fignya/model";
import type { Rec } from "../src/fig/guards";
import { importDocument } from "../src/import-document";
import { box, figMessage, guid, type FigSpec } from "./fixtures";

const mode = (localID: number): Rec => ({ sessionID: 9, localID });

const COMPACT = 1;

const ROOMY = 2;

const roomy: Rec = { variableModeBySetMap: { entries: [{ variableSetID: { guid: guid(4) }, variableModeID: mode(ROOMY) }] } };

const float = (id: number, key: string, compact: number | string, spacious: number | string = compact): FigSpec => {
  const data = (v: number | string): Rec => ({ variableData: { value: typeof v === "number" ? { floatValue: v } : { alias: { assetRef: { key: v } } } } });
  return {
    id, parent: 3, position: key, type: "VARIABLE", key, variableSetID: { guid: guid(4) },
    variableDataValues: { entries: [{ modeID: mode(COMPACT), ...data(compact) }, { modeID: mode(ROOMY), ...data(spacious) }] },
  };
};

const bindings = (pairs: [field: string, key: string][]): Rec => ({
  variableConsumptionMap: { entries: pairs.map(([variableField, key]) => ({ variableField, variableData: { value: { alias: { assetRef: { key } } } } })) },
});

const corners = (r: number): Rec => ({
  cornerRadius: r, rectangleTopLeftCornerRadius: r, rectangleTopRightCornerRadius: r, rectangleBottomRightCornerRadius: r, rectangleBottomLeftCornerRadius: r,
});

const rect = (id: number, parent: number, position: string, extra: Rec): FigSpec => ({ id, parent, position, type: "RECTANGLE", name: `R${id}`, ...box(0, 0, 5, 5), ...extra });

const instanceOf = (id: number, parent: number, position: string, override?: Rec): FigSpec => ({
  id, parent, position, type: "INSTANCE", name: `I${id}`, ...box(0, 0, 10, 10),
  symbolData: { symbolID: guid(30), symbolOverrides: override ? [{ guidPath: { guids: [guid(31)] }, ...override }] : [] },
});

const text = (id: number, parent: number, position: string, style = "body", extra: Rec = {}): FigSpec => ({
  id, parent, position, type: "TEXT", name: `T${id}`, ...box(0, 0, 50, 20), textData: { characters: "Aa" }, fontSize: 10, styleIdForText: { assetRef: { key: style } }, ...extra,
});

const plain: Rec = { styleIdForText: { assetRef: { key: "plain" } }, fontSize: 20 };

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page" },
  { id: 3, parent: 1, position: "b", type: "CANVAS", name: "Internal Only Canvas" },
  { id: 4, parent: 3, position: "a", type: "VARIABLE_SET", variableSetModes: [{ id: mode(COMPACT), sortPosition: "!" }, { id: mode(ROOMY), sortPosition: "\"" }] },
  float(5, "radius", 4, 8),
  float(6, "overlap", -1),
  float(7, "loopA", "loopB"),
  float(8, "loopB", "loopA"),
  float(9, "size", 12, 16),
  float(10, "tight", 2),
  { id: 11, parent: 3, position: "k", type: "TEXT", name: "Body", styleType: "TEXT", key: "body", fontSize: 10, ...bindings([["FONT_SIZE", "size"]]) },
  { id: 12, parent: 3, position: "m", type: "TEXT", name: "Plain", styleType: "TEXT", key: "plain", fontSize: 20 },
  { id: 30, parent: 3, position: "l", type: "SYMBOL", name: "C", ...box(0, 0, 10, 10) },
  rect(31, 30, "a", { ...corners(0), ...bindings([["CORNER_RADIUS", "radius"]]) }),
  { id: 20, parent: 2, position: "a", type: "FRAME", name: "Screen", ...box(0, 0, 400, 400) },
  rect(21, 20, "a", { ...corners(1), ...bindings([["CORNER_RADIUS", "radius"], ["RECTANGLE_TOP_LEFT_CORNER_RADIUS", "tight"]]) }),
  rect(22, 20, "b", { ...corners(3), ...bindings([["CORNER_RADIUS", "loopA"]]) }),
  { id: 23, parent: 20, position: "c", type: "FRAME", name: "Row", ...box(0, 0, 100, 20), stackMode: "HORIZONTAL", stackSpacing: 0, ...bindings([["STACK_SPACING", "overlap"]]) },
  text(24, 20, "d"),
  instanceOf(25, 20, "e"),
  instanceOf(26, 20, "f", { ...corners(2), variableConsumptionMap: { entries: [] } }),
  instanceOf(27, 20, "g", corners(2)),
  { id: 40, parent: 20, position: "h", type: "FRAME", name: "Roomy", ...box(0, 0, 100, 100), ...roomy },
  instanceOf(41, 40, "a"),
  text(42, 40, "b"),
  text(28, 20, "i", "plain", bindings([["FONT_SIZE", "size"]])),
  { ...instanceOf(29, 20, "j"), symbolData: { symbolID: guid(32), symbolOverrides: [{ guidPath: { guids: [guid(33)] }, ...plain }] } },
  { id: 32, parent: 3, position: "n", type: "SYMBOL", name: "D", ...box(0, 0, 10, 10) },
  text(33, 32, "a"),
  { ...instanceOf(43, 40, "c"), symbolData: { symbolID: guid(32), symbolOverrides: [{ guidPath: { guids: [guid(33)] }, styleIdForText: { guid: { sessionID: 4294967295, localID: 4294967295 } }, fontSize: 10 }] } },
];

const document = importDocument(figMessage(specs));

const node = (id: number): DesignNode | undefined => document.nodes.get(`1:${id}`);

const at = (id: number, child = 31): Override | undefined => {
  const instance = node(id);
  return instance?.kind === "instance" ? instance.overrides.find((o) => o.path.join("/") === `1:${child}`) : undefined;
};

describe("bound float variables", () => {
  it("spreads a bound uniform radius over the corners without a binding of their own", () => {
    expect(node(21)?.style.borderRadius).toEqual([2, 4, 4, 4]);
  });

  it("keeps literal radii on alias cycles", () => {
    expect(node(22)?.style.borderRadius).toEqual([3, 3, 3, 3]);
  });

  it("takes a negative bound spacing as an overlapping gap", () => {
    expect(node(23)?.style.gap).toBe(-1);
  });

  it("takes font sizes bound in a text style", () => {
    expect(node(24)?.style.fontSize).toBe(12);
    expect(node(42)?.style.fontSize).toBe(16);
  });

  it("resolves component children in the instance's mode", () => {
    expect(node(31)?.style.borderRadius).toEqual([4, 4, 4, 4]);
    expect(at(25)).toBeUndefined();
    expect(at(41)?.style?.borderRadius).toEqual([8, 8, 8, 8]);
  });

  it("keeps a literal the override detaches from the variable", () => {
    expect(at(26)?.style?.borderRadius).toEqual([2, 2, 2, 2]);
  });

  it("lets a text style without a binding replace the bound font size", () => {
    expect(node(28)?.style.fontSize).toBe(20);
    expect(node(33)?.style.fontSize).toBe(12);
    expect(at(29, 33)?.style?.fontSize).toBe(20);
  });

  it("keeps the literal font size of an override that detaches the text style", () => {
    expect(at(43, 33)?.style?.fontSize).toBe(10);
  });

  it("drops a stale literal the override leaves bound", () => {
    expect(at(27)?.style?.borderRadius).toBeUndefined();
  });
});
