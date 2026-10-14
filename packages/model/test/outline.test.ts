import { describe, expect, it } from "vitest";
import { outline } from "../src";
import { agentNodes } from "./agent-nodes";

describe("outline", () => {
  it("lists a screen with collapsed instances and without hidden layers", () => {
    expect(outline(agentNodes(), ["s"])?.split("\n")).toEqual([
      's "s" frame ?,? 400×300',
      '  card "card" instance 10,20 200×100 of "set / c" texts "Hello" "Go"',
      '  note "note" text 0,200 100×20 "Plain note"',
    ]);
  });

  it("expands an instance by its address with overrides applied", () => {
    expect(outline(agentNodes(), ["card"])?.split("\n")).toEqual([
      'card "card" instance 10,20 200×100 of "set / c" texts "Hello" "Go"',
      '  card/title "title" text 8,8 120×20 "Hello"',
      '  card/btn "btn" instance 8,50 80×30 of "bc" texts "Go"',
    ]);
    expect(outline(agentNodes(), ["card", "btn"])?.split("\n")).toEqual([
      'card/btn "btn" instance 8,50 80×30 of "bc" texts "Go"',
      '  card/btn/label "label" text 4,4 70×20 "Go"',
    ]);
  });

  it("cuts the answer at the limit with a tail", () => {
    expect(outline(agentNodes(), ["s"], 1)?.split("\n")).toEqual(['s "s" frame ?,? 400×300', "… ещё 2"]);
  });

  it("returns nothing for a wrong address", () => {
    expect(outline(agentNodes(), ["card", "note"])).toBeUndefined();
  });
});
