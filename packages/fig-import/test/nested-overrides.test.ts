import { describe, expect, it } from "vitest";
import type { Override } from "@fignya/model";
import type { Rec } from "../src/fig/guards";
import { settledRaw } from "../src/convert/swap-rebase";
import { importDocument } from "../src/import-document";
import { buildIndex } from "../src/tree/node-index";
import { box, figMessage, figNode, guid, solid, type FigSpec } from "./fixtures";

const path = (...ids: number[]): Rec => ({ guidPath: { guids: ids.map(guid) } });

const visibleRef = { componentPropRefs: [{ defID: guid(7), componentPropNodeField: "VISIBLE" }] };

const stack = { stackMode: "HORIZONTAL", stackSpacing: 8, cornerRadius: 2 };

const placement = { stackPositioning: "ABSOLUTE", stackChildPrimaryGrow: 1, stackChildAlignSelf: "STRETCH" };

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page" },
  { id: 3, parent: 1, position: "b", type: "CANVAS", name: "Internal Only Canvas" },
  { id: 10, parent: 2, position: "a", type: "FRAME", name: "Screen", ...box(0, 0, 375, 800) },
  {
    id: 20, parent: 10, position: "a", type: "INSTANCE", name: "I", ...box(0, 0, 100, 100),
    symbolData: {
      symbolID: guid(30),
      symbolOverrides: [
        { ...path(33, 41), visible: true },
        { ...path(33, 42), fontSize: 12, textData: { characters: "Base" } },
        { ...path(35, 43), overriddenSymbolID: guid(50) },
        { ...path(35, 43, 51), textData: { characters: "Back" } },
        { ...path(36), componentPropAssignments: [{ defID: guid(7), value: { boolValue: true } }] },
        { ...path(37), overriddenSymbolID: guid(60) },
        { ...path(31), textData: {}, fontSize: 20 },
      ],
    },
  },
  { id: 21, parent: 10, position: "b", type: "INSTANCE", name: "Loop", symbolData: { symbolID: guid(70) }, ...box(0, 0, 5, 5) },
  {
    id: 22, parent: 10, position: "c", type: "INSTANCE", name: "K", ...box(0, 0, 100, 100),
    symbolData: { symbolID: guid(30), symbolOverrides: [{ ...path(35, 43), fillPaints: [solid(1, 0, 0)] }, { ...path(33), overriddenSymbolID: guid(999) }] },
  },
  { id: 30, parent: 3, position: "a", type: "SYMBOL", name: "C", ...box(0, 0, 100, 100) },
  { id: 31, parent: 30, position: "a", type: "TEXT", name: "L", textData: { characters: "Keep" }, fontSize: 14, ...box(0, 0, 5, 5) },
  { id: 33, parent: 30, position: "b", type: "INSTANCE", name: "N", ...box(0, 0, 5, 5), symbolData: { symbolID: guid(40), symbolOverrides: [{ ...path(41), visible: false }, { ...path(42), fontSize: 30, textData: { characters: "Inner" } }] } },
  { id: 35, parent: 30, position: "c", type: "INSTANCE", name: "S", ...box(0, 0, 5, 5), symbolData: { symbolID: guid(40), symbolOverrides: [{ ...path(43), overriddenSymbolID: guid(60) }] } },
  { id: 36, parent: 30, position: "d", type: "INSTANCE", name: "B", ...box(0, 0, 5, 5), symbolData: { symbolID: guid(40) }, componentPropAssignments: [{ defID: guid(7), value: { boolValue: false } }] },
  { id: 37, parent: 30, position: "e", type: "INSTANCE", name: "W", ...box(0, 0, 5, 5), symbolData: { symbolID: guid(50) }, ...stack, fillPaints: [solid(1, 0, 0)], cornerRadius: 4 },
  { id: 40, parent: 3, position: "b", type: "SYMBOL", name: "D", ...box(0, 0, 5, 5) },
  { id: 41, parent: 40, position: "a", type: "FRAME", name: "Icon", ...box(0, 0, 5, 5), ...visibleRef },
  { id: 42, parent: 40, position: "b", type: "TEXT", name: "T", textData: { characters: "Base" }, fontSize: 12, ...box(0, 0, 5, 5) },
  { id: 43, parent: 40, position: "c", type: "INSTANCE", name: "Nest", symbolData: { symbolID: guid(50) }, ...stack, fillPaints: [solid(1, 0, 0)], ...box(0, 0, 5, 5) },
  { id: 50, parent: 3, position: "c", type: "SYMBOL", name: "E", ...stack, fillPaints: [solid(1, 0, 0)], ...box(0, 0, 5, 5) },
  { id: 51, parent: 50, position: "a", type: "TEXT", name: "E text", textData: { characters: "E" }, ...box(0, 0, 5, 5) },
  { id: 60, parent: 3, position: "d", type: "SYMBOL", name: "F", fillPaints: [solid(0, 0, 1)], cornerRadius: 6, ...placement, ...box(0, 0, 5, 5) },
  { id: 70, parent: 3, position: "e", type: "SYMBOL", name: "Self", ...box(0, 0, 5, 5) },
  { id: 71, parent: 70, position: "a", type: "INSTANCE", name: "Again", symbolData: { symbolID: guid(70), symbolOverrides: [{ ...path(71, 71), visible: false }, { ...path(71, 71, 71), visible: false }] }, ...box(0, 0, 5, 5) },
];

const document = importDocument(figMessage(specs));

const overridesOf = (id: string): Override[] => {
  const node = document.nodes.get(id);
  return node?.kind === "instance" ? node.overrides : [];
};

const at = (id: string, ...ids: string[]): Override | undefined => overridesOf(id).find((o) => o.path.join("/") === ids.join("/"));

describe("nested instance overrides", () => {
  it("keeps outer overrides that reset a nested instance's own overrides", () => {
    expect(at("1:20", "1:33", "1:41")).toEqual({ path: ["1:33", "1:41"], hidden: false });
    expect(at("1:20", "1:33", "1:42")).toEqual({ path: ["1:33", "1:42"], style: { fontSize: 12 }, text: "Base" });
  });

  it("keeps a boolean prop that resets the nested instance's own prop", () => {
    expect(at("1:36", "1:41")?.hidden).toBe(true);
    expect(at("1:20", "1:36", "1:41")?.hidden).toBe(false);
  });

  it("swaps back to the original component and resolves deeper paths in it", () => {
    expect(at("1:35", "1:43")?.componentId).toBe("1:60");
    expect(at("1:20", "1:35", "1:43")?.componentId).toBe("1:50");
    expect(at("1:20", "1:35", "1:43", "1:51")?.text).toBe("Back");
  });

  it("restores the original component's container style on swap back", () => {
    expect(at("1:35", "1:43")?.style?.display).toBeUndefined();
    expect(at("1:20", "1:35", "1:43")?.style?.display).toBe("flex");
  });

  it("takes inherited container style from the swapped-in component and keeps own fields", () => {
    const style = at("1:20", "1:37")?.style ?? {};
    expect(style.background).toEqual([{ kind: "solid", color: { r: 0, g: 0, b: 255, a: 1 } }]);
    expect(Object.keys(style)).toContain("display");
    expect(style.display).toBeUndefined();
    expect(Object.keys(style)).not.toContain("borderRadius");
  });

  it("keeps the instance's placement in its parent on swap", () => {
    const index = buildIndex(specs.map(figNode), []);
    const node = index.byKey.get("1:37");
    const raw = node ? settledRaw(index.byKey, node, { overriddenSymbolID: guid(60) }) : {};
    expect(raw.fillPaints).toEqual([solid(0, 0, 1)]);
    expect(Object.keys(placement).filter((key) => key in raw)).toEqual([]);
  });

  it("keeps outer overrides equal to raw values that an inner swap replaced", () => {
    expect(at("1:22", "1:35", "1:43")?.style?.background).toEqual([{ kind: "solid", color: { r: 255, g: 0, b: 0, a: 1 } }]);
  });

  it("skips swaps to components missing from the file", () => {
    expect(at("1:22", "1:33")).toBeUndefined();
  });

  it("ignores text data without characters", () => {
    expect(at("1:20", "1:31")).toEqual({ path: ["1:31"], style: { fontSize: 20 } });
  });

  it("survives components that contain their own instances", () => {
    expect(at("1:71", "1:71", "1:71")?.hidden).toBe(true);
    expect(overridesOf("1:21")).toEqual([]);
  });
});
