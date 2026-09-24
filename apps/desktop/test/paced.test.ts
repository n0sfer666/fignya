import { describe, expect, it } from "vitest";
import { paced } from "../importer/paced";

function* counter(limit: number): Generator<number, string> {
  for (let i = 0; i < limit; i++) yield i;
  return "done";
}

describe("paced", () => {
  it("returns the generator result", async () => {
    expect(await paced(counter(5), { sliceMs: 1000, pauseMs: 0 }, () => undefined)).toBe("done");
  });

  it("reports progress at every slice boundary", async () => {
    const seen: number[] = [];
    await paced(counter(3), { sliceMs: 0, pauseMs: 0 }, (n) => seen.push(n));
    expect(seen).toEqual([0, 1, 2]);
  });
});
