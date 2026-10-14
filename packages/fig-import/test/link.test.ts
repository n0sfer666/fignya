import { describe, expect, it } from "vitest";
import type { Rec } from "../src/fig/guards";
import { linkOf } from "../src/convert/link";
import { guid } from "./fixtures";

const NONE = { sessionID: 4294967295, localID: 4294967295 };

const interaction = (interactionType: string, action: Rec, extra: Rec = {}): Rec => ({
  event: { interactionType },
  actions: [{ connectionType: "INTERNAL_NODE", navigationType: "NAVIGATE", transitionNodeID: guid(9), ...action }],
  ...extra,
});

describe("linkOf", () => {
  it("takes the target of the first click navigation", () => {
    const raw = { prototypeInteractions: [interaction("ON_HOVER", { transitionNodeID: guid(5) }), interaction("ON_CLICK", {}), interaction("ON_CLICK", { transitionNodeID: guid(7) })] };
    expect(linkOf(raw)).toEqual({ link: "1:9" });
  });

  it("ignores other triggers, actions, deleted interactions and empty targets", () => {
    expect(linkOf({})).toEqual({});
    expect(linkOf({ prototypeInteractions: [interaction("MOUSE_ENTER", {})] })).toEqual({});
    expect(linkOf({ prototypeInteractions: [interaction("ON_CLICK", { navigationType: "SWAP_STATE" })] })).toEqual({});
    expect(linkOf({ prototypeInteractions: [interaction("ON_CLICK", { connectionType: "BACK" })] })).toEqual({});
    expect(linkOf({ prototypeInteractions: [interaction("ON_CLICK", {}, { isDeleted: true })] })).toEqual({});
    expect(linkOf({ prototypeInteractions: [interaction("ON_CLICK", { transitionNodeID: NONE })] })).toEqual({});
    expect(linkOf({ prototypeInteractions: [interaction("ON_CLICK", { transitionNodeID: undefined })] })).toEqual({});
  });
});
