import { describe, expect, it } from "vitest";
import type { Rec } from "../src/fig/guards";
import { recs } from "../src/fig/guards";
import { slimNode } from "../src/fig/kept-fields";
import { importDocument } from "../src/import-document";
import { box, figMessage, guid, type FigSpec } from "./fixtures";

const swap = (id: number, interactionType: string, target: number): Rec => ({
  id: guid(id), isDeleted: false, stateManagementVersion: 1,
  event: { interactionType, interactionMaintained: false },
  actions: [{ connectionType: "INTERNAL_NODE", navigationType: "SWAP_STATE", transitionNodeID: guid(target), transitionType: "INSTANT_TRANSITION" }],
});

const retarget = (id: number, target: number): Rec => ({ id: guid(id), isDeleted: false, stateManagementVersion: 1, actions: [{ transitionNodeID: guid(target) }] });

const path = (...ids: number[]): Rec => ({ guidPath: { guids: ids.map(guid) } });

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page" },
  { id: 3, parent: 1, position: "b", type: "CANVAS", name: "Internal Only Canvas" },
  { id: 10, parent: 2, position: "a", type: "FRAME", name: "Home", ...box(0, 0, 100, 100) },
  {
    id: 12, parent: 10, position: "a", type: "INSTANCE", name: "Tabs", ...box(0, 0, 10, 10), prototypeInteractions: [swap(901, "ON_HOVER", 40)],
    symbolData: { symbolID: guid(30), symbolOverrides: [{ ...path(31), prototypeInteractions: [retarget(931, 50)] }, { ...path(32), prototypeInteractions: [{ id: guid(932), isDeleted: true, stateManagementVersion: 1 }] }] },
  },
  { id: 13, parent: 10, position: "b", type: "INSTANCE", name: "Plain", ...box(0, 0, 10, 10), prototypeInteractions: [swap(901, "ON_HOVER", 40)], symbolData: { symbolID: guid(30) } },
  { id: 20, parent: 3, position: "a", type: "FRAME", name: "Tabs set", ...box(0, 0, 100, 100) },
  { id: 30, parent: 20, position: "a", type: "SYMBOL", name: "State=Default", ...box(0, 0, 10, 10), prototypeInteractions: [swap(901, "ON_HOVER", 40)] },
  { id: 31, parent: 30, position: "a", type: "FRAME", name: "Tab", ...box(0, 0, 5, 5), prototypeInteractions: [swap(931, "ON_CLICK", 40)] },
  { id: 32, parent: 30, position: "b", type: "FRAME", name: "Other", ...box(0, 0, 5, 5), prototypeInteractions: [swap(932, "MOUSE_ENTER", 40)] },
  { id: 40, parent: 20, position: "b", type: "SYMBOL", name: "State=Hover", ...box(0, 0, 10, 10), prototypeInteractions: [swap(941, "MOUSE_LEAVE", 30)] },
  { id: 50, parent: 20, position: "c", type: "SYMBOL", name: "State=Active", ...box(0, 0, 10, 10) },
];

const message = figMessage(specs);

describe("variant swaps", () => {
  const nodes = importDocument(message).nodes;
  const overrides = (id: string) => {
    const node = nodes.get(id);
    return node?.kind === "instance" ? node.overrides : [];
  };

  it("keeps the swaps of variants, their layers and instances", () => {
    expect(nodes.get("1:30")?.swaps).toEqual([{ on: "hover", to: "1:40" }]);
    expect(nodes.get("1:40")?.swaps).toEqual([{ on: "leave", to: "1:30" }]);
    expect(nodes.get("1:31")?.swaps).toEqual([{ on: "click", to: "1:40" }]);
    expect(nodes.get("1:12")?.swaps).toEqual([{ on: "hover", to: "1:40" }]);
    expect(nodes.get("1:50")?.swaps).toBeUndefined();
  });

  it("merges an override into the layer's interaction by id", () => {
    expect(overrides("1:12")).toEqual([
      { path: ["1:31"], swaps: [{ on: "click", to: "1:50" }] },
      { path: ["1:32"], swaps: [] },
    ]);
    expect(overrides("1:13")).toEqual([]);
  });

  it("survives slimming with only the fields it reads", () => {
    const slimmed: Rec = { ...message, nodeChanges: recs(message, "nodeChanges").map(slimNode) };
    expect(importDocument(slimmed)).toEqual(importDocument(message));
    expect(recs(message, "nodeChanges").map(slimNode)[7]?.prototypeInteractions).toEqual([
      { id: guid(901), isDeleted: false, event: { interactionType: "ON_HOVER" }, actions: [{ connectionType: "INTERNAL_NODE", navigationType: "SWAP_STATE", transitionNodeID: guid(40) }] },
    ]);
  });
});
