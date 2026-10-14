import { describe, expect, it } from "vitest";
import { restoreWarning } from "../main/restore-warning";

const clean = { edits: 3, skipped: 0, stale: false, key: "k" };

describe("restoreWarning", () => {
  it("says nothing when every saved edit was restored", () => {
    expect(restoreWarning(clean, "a.fig.fignya")).toBeUndefined();
  });

  it("explains a sidecar for another version of the file", () => {
    expect(restoreWarning({ ...clean, edits: 0, stale: true }, "a.fig.fignya")).toBe(
      "a.fig.fignya was saved for a different version of this file or can't be read, so its changes were not applied. Saving will move it to a.fig.fignya.bak.",
    );
  });

  it("counts saved edits that no longer fit", () => {
    expect(restoreWarning({ ...clean, skipped: 2 }, "a.fig.fignya")).toBe(
      "2 of 5 saved changes in a.fig.fignya no longer match this file and were not applied. Saving will move it to a.fig.fignya.bak.",
    );
  });
});
