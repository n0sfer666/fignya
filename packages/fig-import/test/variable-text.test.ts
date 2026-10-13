import { describe, expect, it } from "vitest";
import type { DesignNode, Override } from "@fignya/model";
import type { Rec } from "../src/fig/guards";
import { importDocument } from "../src/import-document";
import { NO_MODES } from "../src/tree/variable-modes";
import { withText } from "../src/tree/variable-text";
import { box, figMessage, guid, type FigSpec } from "./fixtures";

const mode = (localID: number): Rec => ({ sessionID: 9, localID });

const MEN = 1;

const CHEESE = 2;

const cheese: Rec = { variableModeBySetMap: { entries: [{ variableSetID: { guid: guid(4) }, variableModeID: mode(CHEESE) }] } };

const stringVariable = (id: number, key: string, men: string, other: string): FigSpec => ({
  id, parent: 3, position: key, type: "VARIABLE", key, variableSetID: { guid: guid(4) },
  variableDataValues: {
    entries: [
      { modeID: mode(MEN), variableData: { value: { textValue: men } } },
      { modeID: mode(CHEESE), variableData: { value: { textValue: other } } },
    ],
  },
});

const bound = (key: string): Rec => ({ variableConsumptionMap: { entries: [{ variableField: "TEXT_DATA", variableData: { value: { alias: { assetRef: { key } } } } }] } });

const text = (id: number, parent: number, position: string, extra: Rec = {}): FigSpec => ({
  id, parent, position, type: "TEXT", name: `T${id}`, ...box(0, 0, 50, 20), textData: { characters: "Master" }, fontSize: 10, ...extra,
});

const instanceOf = (id: number, parent: number, position: string, symbol: number, overrides: Rec[] = []): FigSpec => ({
  id, parent, position, type: "INSTANCE", name: `I${id}`, ...box(0, 0, 50, 20), symbolData: { symbolID: guid(symbol), symbolOverrides: overrides },
});

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page" },
  { id: 3, parent: 1, position: "b", type: "CANVAS", name: "Internal Only Canvas" },
  { id: 4, parent: 3, position: "a", type: "VARIABLE_SET", variableSetModes: [{ id: mode(MEN), sortPosition: "!" }, { id: mode(CHEESE), sortPosition: "\"" }] },
  stringVariable(5, "category", "Мужская фертильность", "Сыр"),
  { id: 30, parent: 3, position: "c", type: "SYMBOL", name: "Select", ...box(0, 0, 50, 20) },
  text(31, 30, "a"),
  { id: 32, parent: 3, position: "d", type: "SYMBOL", name: "Label", ...box(0, 0, 50, 20) },
  text(33, 32, "a", bound("category")),
  { id: 20, parent: 2, position: "a", type: "FRAME", name: "Screen", ...box(0, 0, 400, 400) },
  text(21, 20, "a", bound("category")),
  instanceOf(22, 20, "b", 30, [{ guidPath: { guids: [guid(31)] }, ...bound("category") }]),
  instanceOf(23, 20, "c", 32),
  { id: 40, parent: 20, position: "d", type: "FRAME", name: "Cheese", ...box(0, 0, 100, 100), ...cheese },
  text(41, 40, "a", bound("category")),
  instanceOf(42, 40, "b", 30, [{ guidPath: { guids: [guid(31)] }, ...bound("category") }]),
  instanceOf(43, 40, "c", 32),
  instanceOf(44, 40, "d", 30, [{ guidPath: { guids: [guid(31)] }, textData: { characters: "Literal" } }]),
  instanceOf(45, 40, "e", 32, [{ guidPath: { guids: [guid(33)] }, textData: { characters: "Detached" }, variableConsumptionMap: { entries: [] } }]),
  instanceOf(46, 40, "f", 32, [{ guidPath: { guids: [guid(33)] }, textData: { characters: "Stale" } }]),
  { id: 34, parent: 3, position: "e", type: "SYMBOL", name: "Field", ...box(0, 0, 50, 20) },
  instanceOf(35, 34, "a", 32),
  instanceOf(47, 40, "g", 34),
];

const document = importDocument(figMessage(specs));

const node = (id: number): DesignNode | undefined => document.nodes.get(`1:${id}`);

const at = (id: number, child: number): Override | undefined => {
  const instance = node(id);
  return instance?.kind === "instance" ? instance.overrides.find((o) => o.path.join("/") === `1:${child}`) : undefined;
};

const textOf = (target: DesignNode | Override | undefined): string | undefined => (target && "text" in target ? target.text : undefined);

describe("bound text variables", () => {
  it("takes the characters of a bound string in the frame's mode", () => {
    expect(textOf(node(21))).toBe("Мужская фертильность");
    expect(textOf(node(41))).toBe("Сыр");
  });

  it("resolves a string the instance override binds in the instance's mode", () => {
    expect(textOf(at(22, 31))).toBe("Мужская фертильность");
    expect(textOf(at(42, 31))).toBe("Сыр");
  });

  it("resolves a component text bound in the master per instance mode", () => {
    expect(textOf(node(33))).toBe("Мужская фертильность");
    expect(at(23, 33)).toBeUndefined();
    expect(textOf(at(43, 33))).toBe("Сыр");
  });

  it("keeps a literal override without a binding", () => {
    expect(textOf(at(44, 31))).toBe("Literal");
  });

  it("keeps a literal the override detaches from the variable", () => {
    expect(textOf(at(45, 33))).toBe("Detached");
  });

  it("drops a stale literal the override leaves bound", () => {
    expect(textOf(at(46, 33))).toBe("Сыр");
  });

  it("resolves a bound text of a nested component in the outer instance's mode", () => {
    const outer = node(47);
    const nested = outer?.kind === "instance" ? outer.overrides.find((o) => o.path.join("/") === "1:35/1:33") : undefined;
    expect(textOf(nested)).toBe("Сыр");
  });

  it("returns the same fields when the bound string is already there", () => {
    const fields: Rec = { textData: { characters: "Сыр" }, ...bound("category") };
    expect(withText(() => "Сыр", NO_MODES, fields)).toBe(fields);
    expect(withText(() => undefined, NO_MODES, fields)).toBe(fields);
  });
});
