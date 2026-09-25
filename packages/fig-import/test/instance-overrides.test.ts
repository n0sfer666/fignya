import { describe, expect, it } from "vitest";
import type { Override } from "@fignya/model";
import type { Rec } from "../src/fig/guards";
import { instanceResolver } from "../src/convert/instance-resolver-cache";
import { importDocument } from "../src/import-document";
import { buildIndex } from "../src/tree/node-index";
import { box, figMessage, figNode, guid, solid, type FigSpec } from "./fixtures";

const path = (...ids: number[]): Rec => ({ guidPath: { guids: ids.map(guid) } });

const assignment = (def: number, value: Rec): Rec => ({ defID: guid(def), value });

const ref = (def: number, field: string): Rec => ({ componentPropRefs: [{ defID: guid(def), componentPropNodeField: field }] });

const overrides: Rec[] = [
  { ...path(131), textData: { characters: "Over" }, fontSize: 20 },
  { ...path(32), visible: true },
  { ...path(35), fillPaints: [solid(0, 0, 1)] },
  { ...path(36), fontSize: 12 },
  { ...path(33), overriddenSymbolID: guid(50) },
  { ...path(33, 51), textData: { characters: "Swapped" } },
  { ...path(34, 42, 61), textData: { characters: "Deep" } },
  { ...path(37), componentPropAssignments: [assignment(8, { textValue: { characters: "Nested prop" } })] },
  { ...path(38), visible: true, size: { x: 70, y: 10 } },
  { ...path(999), visible: false },
  { ...path(130), size: { x: 1, y: 1 }, fillPaints: [solid(0, 1, 0)] },
];

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page" },
  { id: 3, parent: 1, position: "b", type: "CANVAS", name: "Internal Only Canvas" },
  { id: 10, parent: 2, position: "a", type: "FRAME", name: "Screen", ...box(0, 0, 375, 800) },
  {
    id: 20, parent: 10, position: "a", type: "INSTANCE", name: "I", ...box(0, 0, 100, 100),
    symbolData: { symbolID: guid(30), symbolOverrides: overrides },
    componentPropAssignments: [assignment(7, { boolValue: false }), assignment(9, { guidValue: guid(60) })],
    derivedSymbolData: [{ ...path(38), size: { x: 80, y: 10 }, transform: { m00: 1, m01: 0, m02: 4, m10: 0, m11: 1, m12: 6 } }, { ...path(36), size: { x: 30, y: 30 } }],
  },
  { id: 21, parent: 10, position: "b", type: "INSTANCE", name: "J", symbolData: { symbolID: guid(30), symbolOverrides: [{ ...path(33), componentPropAssignments: [assignment(8, { textValue: { characters: "Last level" } })] }] }, ...box(0, 0, 100, 100) },
  { id: 30, parent: 3, position: "a", type: "SYMBOL", name: "C", overrideKey: guid(130), ...box(0, 0, 100, 100) },
  { id: 31, parent: 30, position: "a", type: "TEXT", name: "L", overrideKey: guid(131), textData: { characters: "Base" }, fontName: { family: "Roboto", style: "Bold" }, fontSize: 14, ...box(0, 0, 50, 20) },
  { id: 32, parent: 30, position: "b", type: "FRAME", name: "Hidden", visible: false, ...box(0, 0, 5, 5) },
  { id: 33, parent: 30, position: "c", type: "INSTANCE", name: "Swap", symbolData: { symbolID: guid(40) }, ...box(0, 0, 5, 5) },
  { id: 34, parent: 30, position: "d", type: "INSTANCE", name: "Outer", symbolData: { symbolID: guid(40), symbolOverrides: [{ ...path(42), overriddenSymbolID: guid(60) }] }, ...box(0, 0, 5, 5) },
  { id: 35, parent: 30, position: "e", type: "VECTOR", name: "Icon", fillPaints: [solid(1, 0, 0)], fillGeometry: [{ commandsBlob: 0 }], ...box(0, 0, 5, 5) },
  { id: 36, parent: 30, position: "f", type: "TEXT", name: "Same", textData: { characters: "S" }, fontSize: 12, ...box(0, 0, 30, 30) },
  { id: 37, parent: 30, position: "g", type: "INSTANCE", name: "PropSwap", symbolData: { symbolID: guid(40) }, ...ref(9, "OVERRIDDEN_SYMBOL_ID"), ...box(0, 0, 5, 5) },
  { id: 38, parent: 30, position: "h", type: "FRAME", name: "Opt", ...ref(7, "VISIBLE"), ...box(0, 0, 5, 5) },
  { id: 40, parent: 3, position: "b", type: "SYMBOL", name: "D", ...box(0, 0, 5, 5) },
  { id: 41, parent: 40, position: "a", type: "TEXT", name: "D text", textData: { characters: "D" }, ...ref(8, "TEXT_DATA"), ...box(0, 0, 5, 5) },
  { id: 42, parent: 40, position: "b", type: "INSTANCE", name: "Inner", symbolData: { symbolID: guid(50) }, ...box(0, 0, 5, 5) },
  { id: 50, parent: 3, position: "c", type: "SYMBOL", name: "E", ...box(0, 0, 5, 5) },
  { id: 51, parent: 50, position: "a", type: "TEXT", name: "E text", textData: { characters: "E" }, ...box(0, 0, 5, 5) },
  { id: 60, parent: 3, position: "d", type: "SYMBOL", name: "F", ...box(0, 0, 5, 5) },
  { id: 61, parent: 60, position: "a", type: "TEXT", name: "F text", textData: { characters: "F" }, ...ref(8, "TEXT_DATA"), ...box(0, 0, 5, 5) },
];

const message = figMessage(specs, [new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0])]);

const instanceOverridesOf = (id: string): Override[] => {
  const node = importDocument(message).nodes.get(id);
  return node?.kind === "instance" ? node.overrides : [];
};

const at = (list: Override[], ...ids: string[]): Override | undefined => list.find((o) => o.path.join("/") === ids.join("/"));

describe("instance overrides", () => {
  const list = instanceOverridesOf("1:20");

  it("matches targets by overrideKey and patches only changed style", () => {
    expect(at(list, "1:31")).toEqual({ path: ["1:31"], text: "Over", style: { fontSize: 20 } });
  });

  it("shows a hidden layer and hides a layer through a boolean prop", () => {
    expect(at(list, "1:32")).toEqual({ path: ["1:32"], hidden: false });
    expect(at(list, "1:38")?.hidden).toBe(true);
  });

  it("lets props win over direct overrides and derived layout win over both", () => {
    expect(at(list, "1:38")).toMatchObject({ hidden: true, style: { width: 80 } });
  });

  it("applies props assigned at the deepest override level", () => {
    expect(at(instanceOverridesOf("1:21"), "1:33", "1:41")?.text).toBe("Last level");
  });

  it("applies derived size and position", () => {
    expect(at(list, "1:38")?.style).toEqual({ width: 80, height: 10, left: 4, top: 6 });
  });

  it("recolors vector paths", () => {
    expect(at(list, "1:35")?.paths?.[0]?.fill).toEqual({ r: 0, g: 0, b: 255, a: 1 });
  });

  it("resolves nested paths through direct, inner and prop swaps", () => {
    expect(at(list, "1:33")?.componentId).toBe("1:50");
    expect(at(list, "1:33", "1:51")?.text).toBe("Swapped");
    expect(at(list, "1:34", "1:42", "1:61")?.text).toBe("Deep");
    expect(at(list, "1:37")?.componentId).toBe("1:60");
    expect(at(list, "1:37", "1:61")?.text).toBe("Nested prop");
  });

  it("drops no-op, unresolved and self-targeting overrides", () => {
    expect(at(list, "1:36")).toBeUndefined();
    expect(list.some((o) => o.path.includes("1:999") || o.path.includes("1:130"))).toBe(false);
    const index = buildIndex(specs.map(figNode), []);
    const instance = index.byKey.get("1:20");
    expect(instance && instanceResolver(index.byKey)(instance).unresolved).toBe(1);
  });

  it("keeps the nested instance's own swap as its own override", () => {
    expect(instanceOverridesOf("1:34")).toEqual([{ path: ["1:42"], componentId: "1:60" }]);
  });
});
