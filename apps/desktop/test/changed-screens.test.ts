import { describe, expect, it } from "vitest";
import { byScreen } from "../main/changed-screens";

describe("changed screens", () => {
  it("groups changed targets by screen", () => {
    const grouped = byScreen([
      { screenId: "1:2", target: ["1:3"] },
      { screenId: "2:2", target: ["2:3"] },
      { screenId: "1:2", target: ["5:1", "1:4"] },
    ]);
    expect([...grouped]).toEqual([
      ["1:2", [["1:3"], ["5:1", "1:4"]]],
      ["2:2", [["2:3"]]],
    ]);
  });
});
