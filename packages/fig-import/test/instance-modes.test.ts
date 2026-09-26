import { describe, expect, it } from "vitest";
import type { Override } from "@fignya/model";
import type { Rec } from "../src/fig/guards";
import { importDocument } from "../src/import-document";
import { box, figMessage, guid, solid, type FigSpec } from "./fixtures";

const mode = (localID: number): Rec => ({ sessionID: 9, localID });

const inMode = (localID: number): Rec => ({ variableModeBySetMap: { entries: [{ variableSetID: { guid: guid(4) }, variableModeID: mode(localID) }] } });

const LIGHT = 1;

const DARK = 2;

const colorValue = (v: number): Rec => ({ variableData: { value: { colorValue: { r: v, g: v, b: v, a: 1 } } } });

const icon = { fillPaints: [solid(0, 0, 0, { colorVar: { value: { alias: { assetRef: { key: "icon" } } } } })] };

const shape = (id: number, parent: number, position: string, extra: Rec = {}): FigSpec => ({ id, parent, position, type: "RECTANGLE", name: `R${id}`, ...icon, ...box(0, 0, 5, 5), ...extra });

const instance = (id: number, parent: number, position: string, symbolID: number, extra: Rec = {}): FigSpec => ({
  id, parent, position, type: "INSTANCE", name: `I${id}`, ...box(0, 0, 10, 10), symbolData: { symbolID: guid(symbolID) }, ...extra,
});

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page" },
  { id: 3, parent: 1, position: "b", type: "CANVAS", name: "Internal Only Canvas" },
  { id: 4, parent: 3, position: "a", type: "VARIABLE_SET", variableSetModes: [{ id: mode(LIGHT), sortPosition: "!" }, { id: mode(DARK), sortPosition: "\"" }] },
  { id: 5, parent: 3, position: "b", type: "VARIABLE", key: "icon", variableSetID: { guid: guid(4) },
    variableDataValues: { entries: [{ modeID: mode(LIGHT), ...colorValue(0) }, { modeID: mode(DARK), ...colorValue(1) }] } },
  { id: 30, parent: 3, position: "c", type: "SYMBOL", name: "C", ...box(0, 0, 50, 50) },
  shape(31, 30, "a"),
  { id: 32, parent: 30, position: "b", type: "FRAME", name: "Forced", ...box(0, 0, 10, 10), ...inMode(LIGHT) },
  shape(33, 32, "a"),
  instance(34, 30, "c", 40),
  shape(35, 30, "d", { fillPaints: [solid(1, 0, 0)] }),
  shape(36, 30, "e", { fillPaints: [solid(1, 0, 0)], strokePaints: icon.fillPaints, strokeWeight: 1 }),
  instance(37, 30, "f", 40, inMode(DARK)),
  { id: 40, parent: 3, position: "d", type: "SYMBOL", name: "D", ...box(0, 0, 10, 10) },
  shape(41, 40, "a"),
  { id: 50, parent: 3, position: "e", type: "SYMBOL", name: "E", ...box(0, 0, 10, 10) },
  shape(51, 50, "a"),
  { id: 60, parent: 3, position: "f", type: "FRAME", name: "Dark sheet", ...box(0, 0, 100, 100), ...inMode(DARK) },
  { id: 61, parent: 60, position: "a", type: "SYMBOL", name: "F", ...box(0, 0, 10, 10) },
  shape(62, 61, "a"),
  { id: 70, parent: 60, position: "b", type: "SYMBOL", name: "G", ...box(0, 0, 10, 10) },
  instance(71, 70, "a", 40),
  { id: 63, parent: 60, position: "c", type: "SYMBOL", name: "DarkE", ...box(0, 0, 10, 10) },
  shape(64, 63, "a"),
  { id: 80, parent: 3, position: "g", type: "SYMBOL", name: "H", ...box(0, 0, 60, 60) },
  instance(81, 80, "a", 30),
  { id: 90, parent: 3, position: "h", type: "SYMBOL", name: "K", ...box(0, 0, 10, 10), ...inMode(DARK) },
  shape(91, 90, "a"),
  { id: 10, parent: 2, position: "a", type: "FRAME", name: "Light", ...box(0, 0, 200, 200) },
  instance(20, 10, "a", 30),
  instance(23, 10, "b", 61),
  instance(24, 10, "c", 70),
  instance(25, 10, "d", 30, { symbolData: { symbolID: guid(30), symbolOverrides: [{ guidPath: { guids: [guid(34)] }, overriddenSymbolID: guid(63) }] } }),
  instance(26, 10, "e", 30, { ...inMode(LIGHT), symbolData: { symbolID: guid(30), symbolOverrides: [{ guidPath: { guids: [guid(34)] }, overriddenSymbolID: guid(63) }] } }),
  instance(28, 10, "f", 90),
  { id: 11, parent: 2, position: "b", type: "FRAME", name: "Dark", ...box(0, 0, 200, 200), ...inMode(DARK) },
  instance(21, 11, "a", 30),
  instance(27, 11, "c", 80),
  instance(22, 11, "b", 30, { symbolData: { symbolID: guid(30), symbolOverrides: [{ guidPath: { guids: [guid(34)] }, overriddenSymbolID: guid(50) }] } }),
];

const document = importDocument(figMessage(specs));

const overridesOf = (id: number): Override[] => {
  const node = document.nodes.get(`1:${id}`);
  return node?.kind === "instance" ? node.overrides : [];
};

const at = (id: number, ...ids: number[]): Override | undefined => overridesOf(id).find((o) => o.path.join("/") === ids.map((i) => `1:${i}`).join("/"));

const white = [{ kind: "solid", color: { r: 255, g: 255, b: 255, a: 1 } }];

const black = [{ kind: "solid", color: { r: 0, g: 0, b: 0, a: 1 } }];

describe("variable modes inside instances", () => {
  it("adds no overrides for an instance in its component's mode context", () => {
    expect(overridesOf(20)).toEqual([]);
  });

  it("repaints component children with the instance's dark mode", () => {
    expect(at(21, 31)?.style?.background).toEqual(white);
  });

  it("repaints children of nested instances", () => {
    expect(at(21, 34, 41)?.style?.background).toEqual(white);
  });

  it("keeps a mode set explicitly inside the component", () => {
    expect(at(21, 33)).toBeUndefined();
  });

  it("leaves paints without variables alone", () => {
    expect(at(21, 35)).toBeUndefined();
  });

  it("repaints the swapped component of a nested instance", () => {
    expect(at(22, 34)?.componentId).toBe("1:50");
    expect(at(22, 34, 51)?.style?.background).toEqual(white);
  });

  it("takes the light mode for a component drawn on a dark sheet", () => {
    expect(at(23, 62)?.style?.background).toEqual(black);
  });

  it("overrides the dark colors a nested instance paints for itself", () => {
    expect(at(71, 41)?.style?.background).toEqual(white);
    expect(at(24, 71, 41)?.style?.background).toEqual(black);
  });

  it("repaints a swapped component drawn on a dark sheet in an instance of the same modes", () => {
    expect(at(25, 34)?.componentId).toBe("1:63");
    expect(at(25, 34, 64)?.style?.background).toEqual(black);
  });

  it("compares a repaint below a swap with the swapped component's own colors", () => {
    expect(at(26, 34, 64)?.style?.background).toEqual(black);
  });

  it("repaints stroke paints", () => {
    expect(JSON.stringify(at(21, 36)?.style)).toContain("255");
  });

  it("keeps a mode set on a nested instance inside the component", () => {
    expect(at(37, 41)?.style?.background).toEqual(white);
    expect(at(21, 37, 41)).toBeUndefined();
  });

  it("repaints three levels deep", () => {
    expect(at(27, 81, 31)?.style?.background).toEqual(white);
    expect(at(27, 81, 34, 41)?.style?.background).toEqual(white);
  });

  it("takes the instance's place over a mode set on the component root", () => {
    expect(at(28, 91)?.style?.background).toEqual(black);
  });
});
