import { describe, expect, it, vi } from "vitest";
import { changesOnly } from "../renderer/src/canvas/changes-only";

describe("changesOnly", () => {
  it("sends the first value and then only changed ones", () => {
    const send = vi.fn();
    const report = changesOnly((ids: string[]) => ids.join(), send);
    report([]);
    report([]);
    report(["a", "b"]);
    report(["a", "b"]);
    report([]);
    expect(send.mock.calls).toEqual([[[]], [["a", "b"]], [[]]]);
  });
});
