import { describe, expect, it } from "vitest";
import type { DesignNode, NodeId, Override, Style } from "@fignya/model";
import { documentFonts } from "../src/document-fonts";

const text = (id: NodeId, style: Style): DesignNode => ({ id, name: id, kind: "text", text: id, children: [], style });

const instance = (id: NodeId, overrides: Override[]): DesignNode => ({ id, name: id, kind: "instance", children: [], style: {}, componentId: "c", overrides });

const mapOf = (...nodes: DesignNode[]) => new Map(nodes.map((n) => [n.id, n]));

describe("documentFonts", () => {
  it("counts text nodes per family and collects their faces", () => {
    const nodes = mapOf(
      text("1", { fontFamily: "Inter", fontWeight: 400 }),
      text("2", { fontFamily: "Roboto", fontWeight: 700, fontStyle: "italic" }),
      text("3", { fontFamily: "Roboto", fontWeight: 400 }),
      text("4", { fontFamily: "Roboto", fontWeight: 400 }),
    );
    expect(documentFonts(nodes)).toEqual([
      { family: "Roboto", nodes: 3, faces: [{ weight: 400, italic: false }, { weight: 700, italic: true }] },
      { family: "Inter", nodes: 1, faces: [{ weight: 400, italic: false }] },
    ]);
  });

  it("completes font overrides from the overridden node", () => {
    const nodes = mapOf(
      text("t", { fontFamily: "Inter", fontWeight: 500, fontStyle: "italic" }),
      instance("i", [
        { path: ["t"], style: { fontFamily: "Rubik" } },
        { path: ["x", "t"], style: { fontWeight: 700 } },
        { path: ["t"], style: { color: { r: 0, g: 0, b: 0, a: 1 } } },
        { path: ["gone"], style: { fontFamily: "Geist" } },
      ]),
    );
    expect(documentFonts(nodes)).toEqual([
      { family: "Inter", nodes: 2, faces: [{ weight: 500, italic: true }, { weight: 700, italic: true }] },
      { family: "Geist", nodes: 1, faces: [{ weight: 400, italic: false }] },
      { family: "Rubik", nodes: 1, faces: [{ weight: 500, italic: true }] },
    ]);
  });

  it("skips instances whose overrides fail to resolve", () => {
    const broken = instance("i", []);
    Object.defineProperty(broken, "overrides", {
      get: () => {
        throw new Error("unresolved");
      },
    });
    expect(documentFonts(mapOf(broken, text("t", { fontFamily: "Inter" })))).toEqual([{ family: "Inter", nodes: 1, faces: [{ weight: 400, italic: false }] }]);
  });
});
