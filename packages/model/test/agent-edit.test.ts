import { describe, expect, it } from "vitest";
import { EDIT_KEYS, parseAddress, parseAgentEdit, STYLE_INPUTS } from "../src";

describe("parseAgentEdit", () => {
  it("parses an address into a chain", () => {
    expect(parseAddress("1:2/3:4")).toEqual(["1:2", "3:4"]);
    expect(parseAddress("1:2//3:4")).toBeUndefined();
    expect(parseAddress("")).toBeUndefined();
    expect(parseAddress("x".repeat(65))).toBeUndefined();
    expect(parseAddress(Array.from({ length: 65 }, () => "a").join("/"))).toBeUndefined();
    expect(parseAddress(Array.from({ length: 64 }, () => "a").join("/"))).toHaveLength(64);
  });

  it("turns CSS strings into a style patch and keeps text", () => {
    expect(parseAgentEdit({ target: "a/b", style: { background: "#ff6600", padding: "8px 16px", borderRadius: "50%" }, text: "Hi" })).toEqual({
      target: ["a", "b"],
      style: { background: [{ kind: "solid", color: { r: 255, g: 102, b: 0, a: 1 } }], padding: [8, 16, 8, 16], borderRadius: "50%" },
      text: "Hi",
    });
  });

  it("rejects unknown keys, bad values, hidden and empty edits", () => {
    expect(parseAgentEdit({ target: "a", style: { stroke: "1px solid #000" } })).toEqual({ reason: '"stroke" is not an editable style key' });
    expect(parseAgentEdit({ target: "a", style: { width: "wide" } })).toEqual({ reason: 'invalid value for "width"' });
    expect(parseAgentEdit({ target: "a", style: { opacity: "2" } })).toEqual({ reason: 'invalid value for "opacity"' });
    expect(parseAgentEdit({ target: "a", hidden: true })).toEqual({ reason: '"hidden" is not editable yet' });
    expect(parseAgentEdit({ target: "a", style: {} })).toEqual({ reason: "nothing to edit" });
    expect(parseAgentEdit({ target: "/", text: "x" })).toEqual({ reason: "invalid address" });
  });

  it("has a parser for every edit key", () => {
    expect(Object.keys(STYLE_INPUTS).sort()).toEqual([...EDIT_KEYS].sort());
  });
});
