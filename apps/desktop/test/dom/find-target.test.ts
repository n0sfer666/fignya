import { describe, expect, it } from "vitest";
import { findTarget } from "../../renderer/src/canvas/find-target";

const tree = (): HTMLElement => {
  const root = document.createElement("div");
  root.innerHTML = `<div data-id="5:2" class="outside"></div><div data-id="1:3" data-kind="instance"><div data-id="5:2"></div></div><div data-id="I1:3;5:2"></div>`;
  return root;
};

describe("findTarget", () => {
  it("finds a node by id", () => {
    expect(findTarget(tree(), ["1:3"])?.getAttribute("data-kind")).toBe("instance");
  });

  it("follows the chain inside the instance", () => {
    const found = findTarget(tree(), ["1:3", "5:2"]);
    expect(found?.parentElement?.getAttribute("data-id")).toBe("1:3");
  });

  it("returns nothing when a link of the chain is missing instead of an ancestor", () => {
    expect(findTarget(tree(), ["1:3", "9:9"])).toBeUndefined();
    expect(findTarget(tree(), ["9:9", "5:2"])).toBeUndefined();
  });
});
