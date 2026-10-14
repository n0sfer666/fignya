import { describe, expect, it } from "vitest";
import type { Rec } from "../src/fig/guards";
import { swapsOf } from "../src/convert/swaps";
import { guid } from "./fixtures";

const NONE = { sessionID: 4294967295, localID: 4294967295 };

const interaction = (interactionType: string, target: number, extra: Rec = {}, action: Rec = {}): Rec => ({
  event: { interactionType },
  actions: [{ connectionType: "INTERNAL_NODE", navigationType: "SWAP_STATE", transitionNodeID: guid(target), ...action }],
  ...extra,
});

describe("swapsOf", () => {
  it("keeps every supported variant swap in order", () => {
    const raw = { prototypeInteractions: [interaction("MOUSE_ENTER", 5), interaction("ON_HOVER", 6), interaction("MOUSE_LEAVE", 7), interaction("ON_CLICK", 8)] };
    expect(swapsOf(raw)).toEqual({ swaps: [{ on: "enter", to: "1:5" }, { on: "hover", to: "1:6" }, { on: "leave", to: "1:7" }, { on: "click", to: "1:8" }] });
  });

  it("ignores other triggers, actions, deleted interactions and empty targets", () => {
    expect(swapsOf({})).toEqual({});
    expect(swapsOf({ prototypeInteractions: [interaction("ON_PRESS", 5), interaction("AFTER_TIMEOUT", 5)] })).toEqual({});
    expect(swapsOf({ prototypeInteractions: [interaction("ON_CLICK", 5, {}, { navigationType: "NAVIGATE" })] })).toEqual({});
    expect(swapsOf({ prototypeInteractions: [interaction("ON_CLICK", 5, { isDeleted: true })] })).toEqual({});
    expect(swapsOf({ prototypeInteractions: [interaction("ON_CLICK", 5, {}, { transitionNodeID: NONE })] })).toEqual({});
    expect(swapsOf({ prototypeInteractions: [interaction("ON_CLICK", 5, {}, { transitionNodeID: undefined })] })).toEqual({});
    expect(swapsOf({ prototypeInteractions: [{ actions: [{ transitionNodeID: guid(5) }] }] })).toEqual({});
  });
});
