import { describe, expect, it } from "vitest";
import { createPlayHistory } from "../renderer/src/play/play-history";

describe("createPlayHistory", () => {
  it("goes forward and back to the start, never past it", () => {
    const history = createPlayHistory("a");
    expect([history.current(), history.previous()]).toEqual(["a", undefined]);
    history.back();
    expect(history.current()).toBe("a");
    history.go("b");
    history.go("c");
    expect([history.current(), history.previous()]).toEqual(["c", "b"]);
    history.back();
    expect(history.current()).toBe("b");
    history.back();
    history.back();
    expect([history.current(), history.previous()]).toEqual(["a", undefined]);
  });

  it("keeps a screen visited twice as two steps", () => {
    const history = createPlayHistory("a");
    history.go("b");
    history.go("a");
    expect(history.previous()).toBe("b");
  });
});
