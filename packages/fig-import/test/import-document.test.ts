import { describe, expect, it } from "vitest";
import type { DesignNode } from "@fignya/model";
import { importDocument } from "../src/import-document";
import { box, figMessage, guid, solid, type FigSpec } from "./fixtures";

const specs: FigSpec[] = [
  { id: 1, type: "DOCUMENT" },
  { id: 2, parent: 1, position: "a", type: "CANVAS", name: "Page A" },
  { id: 3, parent: 1, position: "b", type: "CANVAS", name: "Internal Only Canvas" },
  { id: 10, parent: 2, position: "b", type: "FRAME", name: "S1", stackMode: "VERTICAL", fillPaints: [solid(1, 1, 1)], ...box(100, 0, 375, 800) },
  { id: 11, parent: 2, position: "a", type: "FRAME", name: "S0", ...box(0, 0, 375, 800) },
  { id: 12, parent: 2, position: "c", type: "SECTION", name: "Sec", ...box(1000, 0, 500, 500) },
  { id: 13, parent: 12, position: "a", type: "FRAME", name: "S2", ...box(10, 20, 100, 100) },
  { id: 14, parent: 2, position: "d", type: "FRAME", name: "Hidden", visible: false, ...box(0, 0, 1, 1) },
  { id: 15, parent: 2, position: "e", type: "CONNECTOR" },
  { id: 20, parent: 10, position: "a", type: "TEXT", name: "T", textData: { characters: "Hello" }, fillPaints: [solid(1, 0, 0)], ...box(0, 0, 50, 20) },
  { id: 21, parent: 10, position: "b", type: "INSTANCE", name: "I", symbolData: { symbolID: guid(30) }, fillPaints: [solid(0, 0, 1)], ...box(0, 0, 10, 10) },
  { id: 22, parent: 10, position: "c", type: "VECTOR", name: "V", fillPaints: [solid(0, 0, 0)], fillGeometry: [{ commandsBlob: 0 }] },
  { id: 23, parent: 11, position: "a", type: "ELLIPSE", name: "E", ...box(1, 1, 5, 5) },
  { id: 24, parent: 11, position: "b", type: "BOOLEAN_OPERATION", name: "B", fillPaints: [solid(0, 0, 0)], ...box(0, 0, 5, 5) },
  { id: 25, parent: 24, position: "a", type: "VECTOR", name: "Op", ...box(0, 0, 5, 5) },
  { id: 26, parent: 11, position: "c", type: "INSTANCE", name: "Detached", ...box(0, 0, 5, 5) },
  { id: 30, parent: 3, position: "a", type: "SYMBOL", name: "C", ...box(0, 0, 10, 10) },
  { id: 32, parent: 3, position: "b", type: "SYMBOL", name: "Row", stackMode: "HORIZONTAL", ...box(0, 0, 10, 10) },
  { id: 31, parent: 30, position: "a", type: "ROUNDED_RECTANGLE", name: "R", ...box(0, 0, 10, 10) },
];

const doc = importDocument(figMessage(specs, [new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0])]));

const node = (id: string): DesignNode => {
  const found = doc.nodes.get(id);
  if (!found) throw new Error(`node ${id} missing`);
  return found;
};

describe("importDocument", () => {
  it("lists pages without service page", () => {
    expect(doc.pages.map((p) => [p.id, p.name])).toEqual([["1:2", "Page A"]]);
  });

  it("lists visible screens in order, including sections, in page coordinates", () => {
    expect(doc.pages[0]?.screens).toEqual([
      { id: "1:11", name: "S0", x: 0, y: 0, width: 375, height: 800 },
      { id: "1:10", name: "S1", x: 100, y: 0, width: 375, height: 800 },
      { id: "1:13", name: "S2", x: 1010, y: 20, width: 100, height: 100 },
    ]);
  });

  it("keeps children ordered by position with parent links", () => {
    expect(node("1:10").children).toEqual(["1:20", "1:21", "1:22"]);
    expect(node("1:20").parentId).toBe("1:10");
    expect(node("1:12")).toMatchObject({ kind: "frame", children: ["1:13"] });
  });

  it("maps node kinds", () => {
    expect(node("1:20")).toMatchObject({ kind: "text", text: "Hello", name: "T" });
    expect(node("1:21")).toMatchObject({ kind: "instance", componentId: "1:30", overrides: [], children: [] });
    expect(node("1:22")).toMatchObject({ kind: "vector", paths: [{ d: "M0 0", rule: "nonzero" }] });
    expect(node("1:30")).toMatchObject({ kind: "component", children: ["1:31"] });
    expect(node("1:23").style.borderRadius).toBe("50%");
  });

  it("computes style against the parent layout", () => {
    expect(node("1:20").style).toMatchObject({ position: "relative", width: 50, height: 20, fontFamily: "Inter" });
    expect(node("1:11").style).toMatchObject({ position: "absolute", left: 0, top: 0, overflow: "hidden" });
    expect(node("1:10").style).toMatchObject({ display: "flex", flexDirection: "column" });
  });

  it("keeps hidden nodes flagged and drops skipped types", () => {
    expect(node("1:14").hidden).toBe(true);
    expect(doc.nodes.has("1:15")).toBe(false);
    expect(doc.nodes.has("1:1")).toBe(false);
    expect(doc.nodes.has("1:2")).toBe(false);
  });

  it("puts background on containers only", () => {
    expect(node("1:10").style.background).toEqual([{ kind: "solid", color: { r: 255, g: 255, b: 255, a: 1 } }]);
    expect(node("1:21").style.background).toEqual([{ kind: "solid", color: { r: 0, g: 0, b: 255, a: 1 } }]);
    expect(node("1:20").style).toMatchObject({ color: { r: 255, g: 0, b: 0, a: 1 } });
    expect(node("1:20").style.background).toBeUndefined();
    expect(node("1:24").style.background).toBeUndefined();
  });

  it("does not descend into vector operands", () => {
    expect(node("1:24")).toMatchObject({ kind: "vector", children: [] });
    expect(doc.nodes.has("1:25")).toBe(false);
  });

  it("maps auto layout on components and detached instances to frames", () => {
    expect(node("1:32").style).toMatchObject({ display: "flex", flexDirection: "row" });
    expect(node("1:26")).toMatchObject({ kind: "frame" });
  });
});
