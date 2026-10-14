import { describe, expect, it } from "vitest";
import { pickAgentView } from "../main/agent-view";
import { createViewReport } from "../renderer/src/view-report";
import type { AgentView } from "../shared/api";

describe("agent view", () => {
  it("keeps a valid view from the renderer", () => {
    expect(pickAgentView({ pageId: "0:1", screenId: "1:2", target: ["5:1", "1:3"] })).toEqual({ pageId: "0:1", screenId: "1:2", target: ["5:1", "1:3"] });
    expect(pickAgentView({})).toEqual({});
  });

  it("drops a malformed view", () => {
    for (const value of [null, "view", { pageId: 1 }, { screenId: "" }, { screenId: "x".repeat(65) }, { target: [] }, { target: [1] }])
      expect(pickAgentView(value)).toBeUndefined();
  });

  it("reports the whole view on each change", () => {
    const sent: AgentView[] = [];
    const report = createViewReport((view) => sent.push(view));
    report.page("0:1");
    report.live("1:2");
    report.selected(["1:3"]);
    report.selected(undefined);
    expect(sent).toEqual([{ pageId: "0:1" }, { pageId: "0:1", screenId: "1:2" }, { pageId: "0:1", screenId: "1:2", target: ["1:3"] }, { pageId: "0:1", screenId: "1:2" }]);
  });
});
