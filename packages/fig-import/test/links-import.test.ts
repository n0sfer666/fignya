import { describe, expect, it } from "vitest";
import type { Rec } from "../src/fig/guards";
import { rec, recs } from "../src/fig/guards";
import { slimNode } from "../src/fig/kept-fields";
import { importDocument } from "../src/import-document";
import { box, figMessage, guid, type FigSpec } from "./fixtures";

const click = (target: number, extra: Rec = {}): Rec[] => [
  {
    id: guid(900 + target), isDeleted: false, stateManagementVersion: 1, ...extra,
    event: { interactionType: "ON_CLICK", interactionMaintained: false },
    actions: [{ connectionType: "INTERNAL_NODE", navigationType: "NAVIGATE", transitionNodeID: guid(target), transitionType: "DISSOLVE", easingFunction: [0, 0, 1, 1] }],
  },
];

const path = (...ids: number[]): Rec => ({ guidPath: { guids: ids.map(guid) } });

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page" },
  { id: 3, parent: 1, position: "b", type: "CANVAS", name: "Internal Only Canvas" },
  { id: 10, parent: 2, position: "a", type: "FRAME", name: "Home", ...box(0, 0, 100, 100) },
  { id: 11, parent: 10, position: "a", type: "FRAME", name: "Button", ...box(0, 0, 10, 10), prototypeInteractions: click(20) },
  {
    id: 12, parent: 10, position: "b", type: "INSTANCE", name: "Card", ...box(0, 0, 10, 10), prototypeInteractions: click(10),
    symbolData: { symbolID: guid(30), symbolOverrides: [{ ...path(31), prototypeInteractions: click(20) }, { ...path(32), prototypeInteractions: click(10) }] },
  },
  { id: 20, parent: 2, position: "b", type: "FRAME", name: "Next", ...box(200, 0, 100, 100) },
  { id: 30, parent: 3, position: "a", type: "SYMBOL", name: "C", ...box(0, 0, 10, 10) },
  { id: 31, parent: 30, position: "a", type: "FRAME", name: "Inner", ...box(0, 0, 5, 5) },
  { id: 32, parent: 30, position: "b", type: "FRAME", name: "Same", ...box(0, 0, 5, 5), prototypeInteractions: click(10) },
];

const message = figMessage(specs);

describe("click links", () => {
  const nodes = importDocument(message).nodes;
  const overrides = (id: string) => {
    const node = nodes.get(id);
    return node?.kind === "instance" ? node.overrides : [];
  };

  it("keeps the target of a layer and of an instance", () => {
    expect(nodes.get("1:11")?.link).toBe("1:20");
    expect(nodes.get("1:12")?.link).toBe("1:10");
    expect(nodes.get("1:20")?.link).toBeUndefined();
  });

  it("patches a link changed by an instance override", () => {
    expect(overrides("1:12")).toEqual([{ path: ["1:31"], link: "1:20" }]);
  });

  it("survives slimming with only the fields it reads", () => {
    const slimmed: Rec = { ...message, nodeChanges: recs(message, "nodeChanges").map(slimNode) };
    expect(importDocument(slimmed)).toEqual(importDocument(message));
    const button = recs(slimmed, "nodeChanges")[4];
    expect(button?.prototypeInteractions).toEqual([{ isDeleted: false, event: { interactionType: "ON_CLICK" }, actions: [{ connectionType: "INTERNAL_NODE", navigationType: "NAVIGATE", transitionNodeID: guid(20) }] }]);
    const card = recs(slimmed, "nodeChanges")[5] ?? {};
    expect(recs(rec(card, "symbolData"), "symbolOverrides")[0]?.prototypeInteractions).toEqual(button?.prototypeInteractions);
  });
});
