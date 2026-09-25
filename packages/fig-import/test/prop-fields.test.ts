import { describe, expect, it } from "vitest";
import type { Rec } from "../src/fig/guards";
import { slimNode } from "../src/fig/kept-fields";
import { propFields } from "../src/convert/prop-fields";
import type { ComponentKeys } from "../src/tree/component-keys";
import type { FigNode } from "../src/tree/node-index";
import { guid } from "./fixtures";

const target: FigNode = { key: "1:5", type: "FRAME", raw: {}, children: [] };

const keysWith = (field: string): ComponentKeys => ({ self: new Set(), nodes: new Map(), refs: new Map([["1:7", [{ node: target, field }]]]) });

const variable = (value: Rec, dataType: string): Rec => ({ defID: guid(7), value: {}, varValue: { value, dataType, resolvedDataType: dataType } });

const fieldsOf = (field: string, assignment: Rec): Rec[] => propFields(keysWith(field), [assignment]).map((p) => p.fields);

describe("propFields", () => {
  it("reads bool, text and swap values stored only as variable data", () => {
    expect(fieldsOf("VISIBLE", variable({ boolValue: false }, "BOOLEAN"))).toEqual([{ visible: false }]);
    expect(fieldsOf("TEXT_DATA", variable({ textDataValue: { characters: "Label" } }, "TEXT_DATA"))).toEqual([{ textData: { characters: "Label" } }]);
    expect(fieldsOf("OVERRIDDEN_SYMBOL_ID", variable({ symbolIdValue: { guid: guid(60) } }, "SYMBOL_ID"))).toEqual([{ overriddenSymbolID: guid(60) }]);
  });

  it("prefers variable data over legacy value", () => {
    const both = { ...variable({ boolValue: true }, "BOOLEAN"), value: { boolValue: false } };
    expect(fieldsOf("VISIBLE", both)).toEqual([{ visible: true }]);
  });

  it("keeps legacy value", () => {
    expect(fieldsOf("VISIBLE", { defID: guid(7), value: { boolValue: false } })).toEqual([{ visible: false }]);
  });

  it("survives slimming", () => {
    const raw = { componentPropAssignments: [{ ...variable({ textDataValue: { characters: "Label", lines: [{ styleId: 0 }] } }, "TEXT_DATA") }] };
    expect(slimNode(raw).componentPropAssignments).toEqual([{ defID: guid(7), value: {}, varValue: { value: { textDataValue: { characters: "Label" } } } }]);
  });
});
