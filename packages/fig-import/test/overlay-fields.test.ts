import { describe, expect, it } from "vitest";
import { overlayFields } from "../src/convert/overlay-fields";
import { guid as id } from "./fixtures";

const hover = (localID: number, to: number): Record<string, unknown> => ({
  id: id(localID),
  event: { interactionType: "ON_HOVER" },
  actions: [{ navigationType: "SWAP_STATE", transitionNodeID: id(to) }],
});

const UNDER = { name: "a", prototypeInteractions: [hover(1, 10), hover(2, 20)] };

describe("overlayFields", () => {
  it("merges interactions by id and keeps the rest of the base", () => {
    const over = { prototypeInteractions: [{ id: id(2), actions: [{ transitionNodeID: id(30) }] }] };
    expect(overlayFields(UNDER, over).prototypeInteractions).toEqual([hover(1, 10), hover(2, 30)]);
  });

  it("appends interactions with a new id", () => {
    expect(overlayFields(UNDER, { prototypeInteractions: [hover(3, 40)] }).prototypeInteractions).toEqual([...UNDER.prototypeInteractions, hover(3, 40)]);
  });

  it("keeps the base actions when the override has none", () => {
    const over = { prototypeInteractions: [{ id: id(1), isDeleted: true }] };
    expect(overlayFields(UNDER, over).prototypeInteractions).toEqual([{ ...hover(1, 10), isDeleted: true }, hover(2, 20)]);
  });

  it("takes the override actions when their count differs", () => {
    const actions = [{ navigationType: "NAVIGATE" }, { navigationType: "SWAP_STATE" }];
    const over = { prototypeInteractions: [{ id: id(1), actions }] };
    expect(overlayFields(UNDER, over).prototypeInteractions).toEqual([{ ...hover(1, 10), actions }, hover(2, 20)]);
  });

  it("replaces the list when the override clears it or has interactions without id", () => {
    expect(overlayFields(UNDER, { prototypeInteractions: [] }).prototypeInteractions).toEqual([]);
    const bare = { event: { interactionType: "ON_CLICK" }, actions: [] };
    expect(overlayFields(UNDER, { prototypeInteractions: [bare] }).prototypeInteractions).toEqual([bare]);
  });

  it("overlays plain fields", () => {
    expect(overlayFields(UNDER, { name: "b" })).toEqual({ ...UNDER, name: "b" });
  });
});
