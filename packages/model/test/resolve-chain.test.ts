import { describe, expect, it } from "vitest";
import { resolveChain } from "../src";
import { agentNodes } from "./agent-nodes";

describe("resolveChain", () => {
  it("resolves a plain node", () => {
    expect(resolveChain(agentNodes(), ["note"])?.node).toMatchObject({ id: "note", text: "Plain note" });
  });

  it("applies instance overrides along the chain", () => {
    const nodes = agentNodes();
    expect(resolveChain(nodes, ["card", "title"])?.node).toMatchObject({ id: "title", text: "Hello" });
    expect(resolveChain(nodes, ["card", "btn", "label"])?.node).toMatchObject({ id: "label", text: "Go" });
  });

  it("keeps the scope that applies inside the resolved instance", () => {
    const resolved = resolveChain(agentNodes(), ["card", "btn"]);
    expect(resolved?.node.id).toBe("btn");
    expect(resolved?.scope.get("btn")).toBeUndefined();
  });

  it("refuses unknown ids and links that are not inside the instance component", () => {
    const nodes = agentNodes();
    expect(resolveChain(nodes, [])).toBeUndefined();
    expect(resolveChain(nodes, ["nope"])).toBeUndefined();
    expect(resolveChain(nodes, ["card", "label"])).toBeUndefined();
    expect(resolveChain(nodes, ["note", "title"])).toBeUndefined();
    expect(resolveChain(nodes, ["card", "c"])).toBeUndefined();
  });
});
