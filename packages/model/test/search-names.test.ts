import { describe, expect, it } from "vitest";
import { searchDocument, searchNames, type DesignNode } from "../src";
import { agentDocument, agentNodes } from "./agent-nodes";

const named = (): Map<string, DesignNode> => {
  const nodes = agentNodes();
  const note = nodes.get("note");
  if (note) nodes.set("note", { ...note, name: "Promo Banner" });
  return nodes;
};

describe("searchNames", () => {
  it("finds nodes by a case-insensitive name substring with their place", () => {
    const doc = agentDocument(named());
    expect(searchNames(doc, "banner")).toEqual([
      { match: "name", target: ["note"], kind: "text", trail: ["Screens", "s", "Promo Banner"], hidden: false, place: { pageId: "p1", screenId: "s" } },
    ]);
    expect(searchDocument(doc, "banner")).toEqual([]);
  });

  it("still resolves ids and ignores blank queries", () => {
    const doc = agentDocument(named());
    expect(searchNames(doc, " ")).toEqual([]);
    expect(searchNames(agentDocument(), "1:2")).toEqual([]);
  });
});
