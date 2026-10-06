import { describe, expect, it } from "vitest";
import { searchDocument, type DesignDocument, type DesignNode, type NodeId, type SearchHit } from "../src";
import { collectHits, type Matcher } from "../src/search-document";

const frame = (id: NodeId, name: string, parentId?: NodeId, children: NodeId[] = []): DesignNode => ({
  id,
  name,
  kind: "frame",
  children,
  style: {},
  ...(parentId === undefined ? {} : { parentId }),
});

const nodes: DesignNode[] = [
  frame("1:1", "Section", undefined, ["1:2"]),
  frame("1:2", "Screen", "1:1", ["1:3", "1:5"]),
  { ...frame("1:3", "", "1:2", ["1:4"]), kind: "instance", componentId: "5:1", overrides: [{ path: ["5:3"], hidden: true }, { path: ["5:6"], hidden: true }] },
  { ...frame("1:4", "Badge", "1:3"), hidden: true },
  { ...frame("1:5", "Hidden group", "1:2", ["1:6"]), hidden: true },
  frame("1:6", "Inside", "1:5"),
  { ...frame("5:1", "Button", undefined, ["5:2", "5:3", "5:4", "5:6"]), kind: "component" },
  { ...frame("5:4", "Hidden in master", "5:1", ["5:5"]), hidden: true },
  { id: "5:5", name: "Deep", kind: "text", text: "a", children: [], style: {}, parentId: "5:4" },
  frame("5:6", "Hidden by override", "5:1", ["5:7"]),
  { id: "5:7", name: "Deeper", kind: "text", text: "b", children: [], style: {}, parentId: "5:6" },
  { id: "5:2", name: "Label", kind: "text", text: "Go", children: [], style: {}, parentId: "5:1" },
  { id: "5:3", name: "Icon", kind: "text", text: "→", children: [], style: {}, parentId: "5:1", hidden: false },
  frame("7:1", "Loop A", "7:2"),
  frame("7:2", "Loop B", "7:1"),
  frame("8:1", "Shared", undefined, ["8:2"]),
  frame("8:2", "Card", "8:1"),
];

const doc: DesignDocument = {
  nodes: new Map(nodes.map((n) => [n.id, n])),
  pages: [
    { id: "0:1", name: "Empty", screens: [] },
    { id: "0:2", name: "Work", screens: [{ id: "1:2", name: "Screen", x: 0, y: 0, width: 10, height: 10 }] },
    { id: "0:3", name: "Second", screens: [{ id: "8:2", name: "Card", x: 0, y: 0, width: 10, height: 10 }] },
  ],
};

describe("searchDocument", () => {
  it("finds a screen with its page and trail", () => {
    expect(searchDocument(doc, "1-2")).toEqual([
      { match: "id", target: ["1:2"], kind: "frame", trail: ["Work", "Section", "Screen"], hidden: false, place: { pageId: "0:2", screenId: "1:2" } },
    ]);
  });

  it("finds a nested node through its screen and falls back to the id for unnamed layers", () => {
    const [hit] = searchDocument(doc, "1:4");
    expect(hit).toMatchObject({ target: ["1:4"], trail: ["Work", "Section", "Screen", "1:3", "Badge"], hidden: true, place: { screenId: "1:2" } });
  });

  it("marks a node hidden by an ancestor", () => {
    expect(searchDocument(doc, "1:6")[0]).toMatchObject({ hidden: true, place: { pageId: "0:2" } });
  });

  it("follows an instance sublayer chain", () => {
    const [hit] = searchDocument(doc, "I1:3;5:2");
    expect(hit).toMatchObject({ target: ["1:3", "5:2"], kind: "text", trail: ["Work", "Section", "Screen", "1:3", "Label"], hidden: false, place: { screenId: "1:2" } });
  });

  it("applies the instance visibility override to its sublayer", () => {
    expect(searchDocument(doc, "I1:3;5:3")[0]).toMatchObject({ target: ["1:3", "5:3"], hidden: true });
  });

  it("checks the master ancestors between chain links with their overrides", () => {
    expect(searchDocument(doc, "I1:3;5:5")[0]).toMatchObject({ trail: ["Work", "Section", "Screen", "1:3", "Deep"], hidden: true });
    expect(searchDocument(doc, "I1:3;5:7")[0]).toMatchObject({ hidden: true });
    expect(searchDocument(doc, "5:7")[0]).toMatchObject({ hidden: false });
  });

  it("places by the head ancestry, not by the master of an instance", () => {
    expect(searchDocument(doc, "8:2")[0]?.place).toEqual({ pageId: "0:3", screenId: "8:2" });
    expect(searchDocument(doc, "5:2")[0]).toEqual({ match: "id", target: ["5:2"], kind: "text", trail: ["Button", "Label"], hidden: false });
  });

  it("stops on a parent cycle", () => {
    expect(searchDocument(doc, "7:1")[0]).toMatchObject({ trail: ["Loop B", "Loop A"] });
  });

  it("returns nothing for unknown ids and broken chains", () => {
    expect(searchDocument(doc, "9:9")).toEqual([]);
    expect(searchDocument(doc, "I1:3;9:9")).toEqual([]);
    expect(searchDocument(doc, "Screen")).toEqual([]);
  });
});

describe("collectHits", () => {
  const hit = (target: NodeId[]): SearchHit => ({ match: "id", target, kind: "frame", trail: [], hidden: false });

  it("drops repeated targets across matchers and passes the remaining limit", () => {
    const limits: number[] = [];
    const first: Matcher = (_doc, _query, limit) => {
      limits.push(limit);
      return [hit(["1:1"]), hit(["1:3", "5:2"])];
    };
    const second: Matcher = (_doc, _query, limit) => {
      limits.push(limit);
      return [hit(["1:3", "5:2"]), hit(["1:2"])];
    };
    expect(collectHits([first, second], doc, "q", 5).map((h) => h.target)).toEqual([["1:1"], ["1:3", "5:2"], ["1:2"]]);
    expect(limits).toEqual([5, 3]);
  });

  it("cuts at the limit and skips matchers once it is reached", () => {
    let called = false;
    const many: Matcher = () => [hit(["1:1"]), hit(["1:2"]), hit(["1:3"])];
    const late: Matcher = () => {
      called = true;
      return [];
    };
    expect(collectHits([many, late], doc, "q", 2)).toHaveLength(2);
    expect(called).toBe(false);
  });
});
