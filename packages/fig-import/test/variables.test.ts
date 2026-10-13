import { describe, expect, it } from "vitest";
import { rec, recs, type Rec } from "../src/fig/guards";
import { importDocument } from "../src/import-document";
import { withVariables } from "../src/tree/variables";
import { box, figMessage, figNode, guid, solid, type FigSpec } from "./fixtures";

const mode = (localID: number): Rec => ({ sessionID: 9, localID });

const colorValue = (r: number, g: number, b: number, a = 1): Rec => ({ variableData: { value: { colorValue: { r, g, b, a } } } });

const aliasTo = (key: string): Rec => ({ variableData: { value: { alias: { assetRef: { key } } } } });

const darkBy = (variableSetID: Rec): Rec => ({ variableModeBySetMap: { entries: [{ variableSetID, variableModeID: mode(2) }] } });

const floatValue = (value: number): Rec => ({ variableData: { value: { floatValue: value } } });

const bindTo = (key: string, ...fields: string[]): Rec => ({
  variableConsumptionMap: { entries: fields.map((variableField) => ({ variableField, variableData: { value: { alias: { assetRef: { key } } } } })) },
});

const bound = (key: string): Rec => solid(0, 0, 0, { opacity: 0.5, colorVar: { value: { alias: { assetRef: { key } } } } });

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page" },
  { id: 3, parent: 1, position: "b", type: "CANVAS", name: "Internal Only Canvas" },
  {
    id: 4, parent: 3, position: "a", type: "VARIABLE_SET", key: "theme",
    variableSetModes: [{ id: mode(2), sortPosition: "\"" }, { id: mode(1), sortPosition: "!" }],
  },
  { id: 5, parent: 3, position: "b", type: "VARIABLE_SET", variableSetModes: [{ id: mode(7), sortPosition: "!" }] },
  { id: 6, parent: 3, position: "c", type: "VARIABLE", key: "gray", variableSetID: { guid: guid(5) }, variableDataValues: { entries: [{ modeID: mode(7), ...colorValue(0.5, 0.5, 0.5, 0.5) }] } },
  { id: 7, parent: 3, position: "d", type: "VARIABLE", key: "white", variableSetID: { guid: guid(5) }, variableDataValues: { entries: [{ modeID: mode(7), ...colorValue(1, 1, 1) }] } },
  {
    id: 8, parent: 3, position: "e", type: "VARIABLE", key: "icon", variableSetID: { assetRef: { key: "theme" } },
    variableDataValues: { entries: [{ modeID: mode(2), ...aliasTo("white") }, { modeID: mode(1), ...aliasTo("gray") }] },
  },
  { id: 9, parent: 3, position: "f", type: "VARIABLE", key: "loopA", variableSetID: { guid: guid(5) }, variableDataValues: { entries: [{ modeID: mode(7), ...aliasTo("loopB") }] } },
  { id: 14, parent: 3, position: "g", type: "VARIABLE", key: "loopB", variableSetID: { guid: guid(5) }, variableDataValues: { entries: [{ modeID: mode(7), ...aliasTo("loopA") }] } },
  { id: 17, parent: 3, position: "h", type: "VARIABLE", key: "radius", variableSetID: { guid: guid(5) }, variableDataValues: { entries: [{ modeID: mode(7), ...floatValue(6) }] } },
  { id: 18, parent: 3, position: "i", type: "VARIABLE", key: "space", variableSetID: { guid: guid(5) }, variableDataValues: { entries: [{ modeID: mode(7), ...aliasTo("radius") }] } },
  {
    id: 19, parent: 2, position: "c", type: "FRAME", name: "Rounded", ...box(0, 0, 10, 10),
    rectangleTopLeftCornerRadius: 0, stackHorizontalPadding: 2, ...bindTo("space", "RECTANGLE_TOP_LEFT_CORNER_RADIUS", "STACK_PADDING_LEFT", "LINE_HEIGHT"),
  },
  {
    id: 23, parent: 2, position: "d", type: "INSTANCE", name: "Segment", ...box(0, 0, 10, 10),
    symbolData: { symbolID: guid(30), symbolOverrides: [{ guidPath: { guids: [guid(31)] }, rectangleTopRightCornerRadius: 0, ...bindTo("radius", "RECTANGLE_TOP_RIGHT_CORNER_RADIUS", "RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS") }] },
  },
  { id: 24, parent: 2, position: "e", type: "FRAME", name: "Unbound", ...box(0, 0, 10, 10), cornerRadius: 3, ...bindTo("missing", "CORNER_RADIUS") },
  { id: 10, parent: 2, position: "a", type: "FRAME", name: "Light", ...box(0, 0, 100, 100) },
  { id: 15, parent: 10, position: "d", type: "VECTOR", name: "Own", ...darkBy({ guid: guid(4) }), fillPaints: [bound("icon")], ...box(0, 0, 5, 5) },
  { id: 16, parent: 10, position: "e", type: "VECTOR", name: "Loop", fillPaints: [bound("loopA")], ...box(0, 0, 5, 5) },
  { id: 11, parent: 10, position: "a", type: "VECTOR", name: "Default", fillPaints: [bound("icon")], fillGeometry: [{ commandsBlob: 0 }], ...box(0, 0, 5, 5) },
  { id: 12, parent: 10, position: "b", type: "VECTOR", name: "Unknown", fillPaints: [bound("missing")], ...box(0, 0, 5, 5) },
  {
    id: 13, parent: 10, position: "c", type: "INSTANCE", name: "I", ...box(0, 0, 10, 10),
    symbolData: { symbolID: guid(30), symbolOverrides: [{ guidPath: { guids: [guid(31)] }, strokePaints: [bound("icon")] }] },
  },
  {
    id: 20, parent: 2, position: "b", type: "FRAME", name: "Dark", ...box(0, 0, 100, 100),
    ...darkBy({ assetRef: { key: "theme" } }),
  },
  { id: 21, parent: 20, position: "a", type: "FRAME", name: "Group", ...box(0, 0, 50, 50) },
  { id: 22, parent: 21, position: "a", type: "VECTOR", name: "Nested", fillPaints: [bound("icon")], fillGeometry: [{ commandsBlob: 0 }], ...box(0, 0, 5, 5) },
];

const nodes = specs.map(figNode);

const resolved = withVariables(nodes);

const named = (name: string): Rec | undefined => resolved.find((n) => n.name === name);

const colorOf = (node: Rec | undefined, key = "fillPaints"): unknown => recs(node, key)[0]?.color;

describe("withVariables", () => {
  it("resolves aliases in the set's default mode", () => {
    expect(colorOf(named("Default"))).toEqual({ r: 0.5, g: 0.5, b: 0.5, a: 0.5 });
  });

  it("takes alpha from the variable instead of the stale paint opacity", () => {
    expect(recs(named("Default"), "fillPaints")[0]?.opacity).toBe(1);
  });

  it("uses the mode an ancestor frame sets explicitly", () => {
    expect(colorOf(named("Nested"))).toEqual({ r: 1, g: 1, b: 1, a: 1 });
  });

  it("uses the node's own mode for a set referenced by guid", () => {
    expect(colorOf(named("Own"))).toEqual({ r: 1, g: 1, b: 1, a: 1 });
  });

  it("stops on alias cycles and keeps the inline color", () => {
    expect(named("Loop")).toBe(nodes.find((n) => n.name === "Loop"));
  });

  it("resolves paints inside instance overrides", () => {
    const instance = named("I");
    const override = recs(instance && rec(instance, "symbolData"), "symbolOverrides")[0];
    expect(colorOf(override, "strokePaints")).toEqual({ r: 0.5, g: 0.5, b: 0.5, a: 0.5 });
  });

  it("takes bound numbers over the node's literals", () => {
    expect(named("Rounded")).toMatchObject({ rectangleTopLeftCornerRadius: 6, stackHorizontalPadding: 6 });
  });

  it("takes bound radii over stale or absent literals in instance overrides", () => {
    const instance = named("Segment");
    const override = recs(instance && rec(instance, "symbolData"), "symbolOverrides")[0];
    expect(override).toMatchObject({ rectangleTopRightCornerRadius: 6, rectangleBottomRightCornerRadius: 6 });
  });

  it("keeps the literal number when the variable is not in the file", () => {
    expect(named("Unbound")).toBe(nodes.find((n) => n.name === "Unbound"));
  });

  it("keeps the inline color when the variable is not in the file", () => {
    expect(named("Unknown")).toBe(nodes.find((n) => n.name === "Unknown"));
  });

  it("returns the same nodes when the file has no variables", () => {
    const plain = nodes.filter((n) => n.type !== "VARIABLE");
    expect(withVariables(plain)).toBe(plain);
  });

  it("paints resolved colors into imported vectors", () => {
    const vector = importDocument(figMessage(specs, [new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0])])).nodes.get("1:22");
    expect(vector?.kind === "vector" ? vector.paths[0]?.fill : undefined).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });
});
