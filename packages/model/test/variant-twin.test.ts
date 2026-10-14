import { describe, expect, it } from "vitest";
import { twinPath, type NodeId } from "../src";
import { VARIANT_NODES } from "./variant-nodes";

const nodes = new Map(VARIANT_NODES.map((n) => [n.id, n]));

const unswapped = (): NodeId | undefined => undefined;

describe("twinPath", () => {
  it("finds the layer with the same name chain in the other variant", () => {
    expect(twinPath(nodes, "v", "d", ["v-icon"], unswapped)).toEqual(["d-icon"]);
    expect(twinPath(nodes, "v", "d", ["v-dot"], unswapped)).toEqual(["d-dot"]);
  });

  it("tells namesakes apart by their order", () => {
    expect(twinPath(nodes, "v", "d", ["v-label"], unswapped)).toEqual(["d-label"]);
    expect(twinPath(nodes, "v", "d", ["v-label2"], unswapped)).toEqual(["d-label2"]);
  });

  it("keeps the tail inside a nested instance of the same component", () => {
    expect(twinPath(nodes, "v", "d", ["v-badge", "b1-x"], unswapped)).toEqual(["d-badge", "b1-x"]);
  });

  it("translates the tail when the nested instances differ", () => {
    expect(twinPath(nodes, "v", "d", ["v-chip", "c1-t"], unswapped)).toEqual(["d-chip", "c2-t"]);
  });

  it("keeps the tail when the nested instance is swapped by an override", () => {
    const swapped = (prefix: readonly NodeId[]): NodeId | undefined => (prefix.join("/") === "v-chip" ? "c3" : undefined);
    expect(twinPath(nodes, "v", "d", ["v-chip", "c3-y"], swapped)).toEqual(["d-chip", "c3-y"]);
  });

  it("gives up on layers missing in the other variant", () => {
    expect(twinPath(nodes, "v", "d", ["v-gone"], unswapped)).toBeUndefined();
    expect(twinPath(nodes, "v", "d", ["x"], unswapped)).toBeUndefined();
    expect(twinPath(nodes, "v", "d", [], unswapped)).toBeUndefined();
    expect(twinPath(nodes, "v", "d", ["v-chip", "x"], unswapped)).toBeUndefined();
  });
});
