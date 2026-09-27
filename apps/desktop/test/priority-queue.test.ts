import { describe, expect, it } from "vitest";
import { priorityQueue } from "../main/priority-queue";

const pause = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

describe("priorityQueue", () => {
  it("runs tasks one at a time in order and survives failures", async () => {
    const queue = priorityQueue();
    const log: string[] = [];
    const task = (name: string, fail = false) => async (): Promise<string> => {
      log.push(`start ${name}`);
      await pause();
      log.push(`end ${name}`);
      if (fail) throw new Error(name);
      return name;
    };
    const results = await Promise.allSettled([queue(1, task("a")), queue(1, task("b", true)), queue(1, task("c"))]);
    expect(log).toEqual(["start a", "end a", "start b", "end b", "start c", "end c"]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
  });

  it("starts waiting tasks with a lower priority number first", async () => {
    const queue = priorityQueue();
    const log: string[] = [];
    const task = (name: string) => async (): Promise<void> => {
      log.push(name);
      await pause();
    };
    await Promise.all([queue(0.5, task("running")), queue(2, task("sharp a")), queue(2, task("sharp b")), queue(0.5, task("base"))]);
    expect(log).toEqual(["running", "base", "sharp a", "sharp b"]);
  });

  it("keeps going after a task throws synchronously", async () => {
    const queue = priorityQueue();
    const broken = (): Promise<string> => {
      throw new Error("sync");
    };
    await expect(queue(1, broken)).rejects.toThrow("sync");
    await expect(queue(1, async () => "next")).resolves.toBe("next");
  });
});
