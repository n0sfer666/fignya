import { describe, expect, it } from "vitest";
import type { Rec } from "../src/fig/guards";
import { settledRaw } from "../src/convert/swap-rebase";
import { buildIndex } from "../src/tree/node-index";
import { box, figNode, guid, solid, type FigSpec } from "./fixtures";

const colorVar = (key: string): Rec => ({ colorVar: { value: { alias: { assetRef: { key } } }, dataType: "ALIAS" } });
const sideStroke = { borderStrokeWeightsIndependent: true, borderBottomWeight: 2 };

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 3, parent: 1, position: "a", type: "CANVAS", name: "Internal Only Canvas" },
  { id: 30, parent: 3, position: "a", type: "SYMBOL", name: "Selected", strokePaints: [solid(0, 0, 0, colorVar("v"))], ...sideStroke, ...box(0, 0, 5, 5) },
  { id: 31, parent: 3, position: "b", type: "SYMBOL", name: "Plain", ...box(0, 0, 5, 5) },
  { id: 40, parent: 3, position: "c", type: "SYMBOL", name: "Tabs", ...box(0, 0, 20, 5) },
  { id: 41, parent: 40, position: "a", type: "INSTANCE", name: "Bound", symbolData: { symbolID: guid(30) }, strokePaints: [solid(1, 1, 1, colorVar("v"))], ...sideStroke, ...box(0, 0, 5, 5) },
  { id: 42, parent: 40, position: "b", type: "INSTANCE", name: "Rebound", symbolData: { symbolID: guid(30) }, strokePaints: [solid(1, 1, 1, colorVar("w"))], ...sideStroke, ...box(5, 0, 5, 5) },
  { id: 43, parent: 40, position: "c", type: "INSTANCE", name: "Raw", symbolData: { symbolID: guid(30) }, strokePaints: [solid(1, 0, 0)], ...sideStroke, ...box(10, 0, 5, 5) },
];

const swapped = (id: string): Rec => {
  const index = buildIndex(specs.map(figNode), []);
  const node = index.byKey.get(id);
  return node ? settledRaw(index.byKey, node, { overriddenSymbolID: guid(31) }) : {};
};

describe("swap with variable-bound paints", () => {
  it("takes the swapped-in component's stroke when the paint is bound to the same variable", () => {
    const raw = swapped("1:41");
    expect(raw.strokePaints).toBeUndefined();
    expect(raw.borderStrokeWeightsIndependent).toBeUndefined();
  });

  it("keeps a paint bound to another variable as an override", () => {
    expect(swapped("1:42").strokePaints).toEqual([solid(1, 1, 1, colorVar("w"))]);
  });

  it("keeps an unbound paint that differs from the original component", () => {
    expect(swapped("1:43").strokePaints).toEqual([solid(1, 0, 0)]);
  });
});
