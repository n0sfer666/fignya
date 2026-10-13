import { describe, expect, it } from "vitest";
import { priorityQueue } from "../main/priority-queue";

const pause = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

describe("priorityQueue", () => {
  it("runs tasks one at a time in order and survives failures", async () => {
    const queue = priorityQueue<string>();
    const log: string[] = [];
    const task = (name: string, fail = false) => async (): Promise<string> => {
      log.push(`start ${name}`);
      await pause();
      log.push(`end ${name}`);
      if (fail) throw new Error(name);
      return name;
    };
    const results = await Promise.allSettled([queue.run(1, "p", task("a")), queue.run(1, "p", task("b", true)), queue.run(1, "p", task("c"))]);
    expect(log).toEqual(["start a", "end a", "start b", "end b", "start c", "end c"]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
  });

  it("starts waiting tasks with a lower priority number first", async () => {
    const queue = priorityQueue<string>();
    const log: string[] = [];
    const task = (name: string) => async (): Promise<void> => {
      log.push(name);
      await pause();
    };
    await Promise.all([queue.run(0.5, "p", task("running")), queue.run(2, "p", task("sharp a")), queue.run(2, "p", task("sharp b")), queue.run(0.5, "p", task("base"))]);
    expect(log).toEqual(["running", "base", "sharp a", "sharp b"]);
  });

  it("keeps going after a task throws synchronously", async () => {
    const queue = priorityQueue<string>();
    const broken = (): Promise<string> => {
      throw new Error("sync");
    };
    await expect(queue.run(1, "p", broken)).rejects.toThrow("sync");
    await expect(queue.run(1, "p", async () => "next")).resolves.toBe("next");
  });

  const named = (log: string[], name: string, fail = false) => async (): Promise<string> => {
    log.push(name);
    await pause();
    if (fail) throw new Error(name);
    return name;
  };

  it("drops waiting tasks of other tags so a new page does not wait behind the old one", async () => {
    const queue = priorityQueue<string>();
    const log: string[] = [];
    const old = [queue.run(0.5, "old", named(log, "old running")), queue.run(0.5, "old", named(log, "old a")), queue.run(0.5, "old", named(log, "old b"))];
    queue.keepOnly((tag) => tag === "new");
    const fresh = [queue.run(2, "new", named(log, "new sharp")), queue.run(0.5, "old", named(log, "old late")), queue.run(0.5, "new", named(log, "new base"))];
    expect(await Promise.all([...old, ...fresh])).toEqual(["old running", undefined, undefined, "new sharp", "old late", "new base"]);
    expect(log).toEqual(["old running", "new base", "new sharp", "old late"]);
  });

  it("keeps tasks of a tag that arrive before the tag is kept", async () => {
    const queue = priorityQueue<string>();
    const log: string[] = [];
    queue.keepOnly((tag) => tag === "old");
    const running = queue.run(0.5, "old", named(log, "old running"));
    const early = queue.run(0.5, "new", named(log, "new early"));
    queue.keepOnly((tag) => tag === "new");
    await expect(Promise.all([running, early])).resolves.toEqual(["old running", "new early"]);
    expect(queue.wants("new")).toBe(true);
    expect(queue.wants("old")).toBe(false);
  });

  it("takes a tag back after switching away from it", async () => {
    const queue = priorityQueue<string>();
    const log: string[] = [];
    queue.keepOnly((tag) => tag === "new");
    queue.keepOnly((tag) => tag === "old");
    await expect(queue.run(0.5, "old", named(log, "old again"))).resolves.toBe("old again");
  });

  it("still rejects a running task whose tag was dropped and moves on", async () => {
    const queue = priorityQueue<string>();
    const log: string[] = [];
    const running = queue.run(0.5, "old", named(log, "old failing", true));
    const next = queue.run(0.5, "new", named(log, "new"));
    queue.keepOnly((tag) => tag === "new");
    await expect(running).rejects.toThrow("old failing");
    await expect(next).resolves.toBe("new");
  });

  it("starts preferred tasks before earlier ones, then by priority", async () => {
    const queue = priorityQueue<string>();
    const log: string[] = [];
    const all = [
      queue.run(0.5, "a", named(log, "a running")),
      queue.run(0.5, "b", named(log, "b base")),
      queue.run(0.5, "c", named(log, "c base")),
      queue.run(2, "d", named(log, "d sharp")),
      queue.run(0.5, "d", named(log, "d base")),
    ];
    queue.prefer((tag) => tag === "d");
    await Promise.all(all);
    expect(log).toEqual(["a running", "d base", "d sharp", "b base", "c base"]);
  });

  it("reorders waiting tasks when the preference changes", async () => {
    const queue = priorityQueue<string>();
    const log: string[] = [];
    queue.prefer((tag) => tag === "c");
    const all = [queue.run(0.5, "a", named(log, "a")), queue.run(0.5, "b", named(log, "b")), queue.run(0.5, "c", named(log, "c"))];
    queue.prefer((tag) => tag === "b");
    await Promise.all(all);
    expect(log).toEqual(["a", "b", "c"]);
  });

  it("keeps wanted tags ahead of preferred ones", async () => {
    const queue = priorityQueue<string>();
    const log: string[] = [];
    queue.keepOnly((tag) => tag !== "old");
    queue.prefer((tag) => tag === "old");
    const all = [queue.run(0.5, "new", named(log, "new running")), queue.run(0.5, "old", named(log, "old late")), queue.run(2, "new", named(log, "new sharp"))];
    await Promise.all(all);
    expect(log).toEqual(["new running", "new sharp", "old late"]);
  });
});
