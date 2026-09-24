import { describe, expect, it } from "vitest";
import { serialQueue } from "../main/serial-queue";

describe("serialQueue", () => {
  it("runs tasks one at a time in order and survives failures", async () => {
    const queue = serialQueue();
    const log: string[] = [];
    const task = (name: string, fail = false) => async (): Promise<string> => {
      log.push(`start ${name}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      log.push(`end ${name}`);
      if (fail) throw new Error(name);
      return name;
    };
    const results = await Promise.allSettled([queue(task("a")), queue(task("b", true)), queue(task("c"))]);
    expect(log).toEqual(["start a", "end a", "start b", "end b", "start c", "end c"]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
  });
});
