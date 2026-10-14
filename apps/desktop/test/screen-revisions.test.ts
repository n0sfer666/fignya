import { describe, expect, it } from "vitest";
import { screenRevisions } from "../main/screen-revisions";

describe("screenRevisions", () => {
  it("counts changes per screen from zero", () => {
    const revisions = screenRevisions();
    expect(revisions.of("1:2")).toBe(0);
    expect(revisions.bump("1:2")).toBe(1);
    expect(revisions.bump("1:2")).toBe(2);
    expect(revisions.of("1:2")).toBe(2);
    expect(revisions.of("3:4")).toBe(0);
  });

  it("knows whether the document was edited at all", () => {
    const revisions = screenRevisions();
    expect(revisions.edited()).toBe(false);
    revisions.bump("1:2");
    expect(revisions.edited()).toBe(true);
  });

  it("counts an edit outside any screen as an edit of the document", () => {
    const revisions = screenRevisions();
    revisions.touch();
    expect(revisions.edited()).toBe(true);
    expect(revisions.of("1:2")).toBe(0);
  });
});
