import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchHit } from "@fignya/model";
import { createSearchRunner, type SearchResult } from "../renderer/src/search-runner";

const hit = (id: string): SearchHit => ({ match: "id", target: [id], kind: "frame", trail: [], hidden: false });

const deferred = () => {
  const calls: { query: string; resolve: (hits: SearchHit[]) => void }[] = [];
  const search = (query: string): Promise<SearchHit[]> => new Promise((resolve) => calls.push({ query, resolve }));
  return { calls, search };
};

describe("createSearchRunner", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("debounces typing into one search for the last query", async () => {
    const { calls, search } = deferred();
    const results: SearchResult[] = [];
    const runner = createSearchRunner(search, (r) => results.push(r), 100);
    runner.later("1");
    runner.later("1:");
    runner.later("1:2");
    vi.advanceTimersByTime(99);
    expect(calls).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(calls.map((c) => c.query)).toEqual(["1:2"]);
    calls[0]?.resolve([hit("1:2")]);
    await vi.runAllTimersAsync();
    expect(results).toEqual([{ query: "1:2", hits: [hit("1:2")] }]);
  });

  it("drops an answer that arrives after a newer query", async () => {
    const { calls, search } = deferred();
    const results: SearchResult[] = [];
    const runner = createSearchRunner(search, (r) => results.push(r), 100);
    const first = runner.now("1:1");
    runner.later("1:2");
    calls[0]?.resolve([hit("1:1")]);
    expect(await first).toBeUndefined();
    expect(results).toEqual([]);
  });

  it("cancels a pending debounce when searching now and returns its hits", async () => {
    const { calls, search } = deferred();
    const results: SearchResult[] = [];
    const runner = createSearchRunner(search, (r) => results.push(r), 100);
    runner.later("1:1");
    const now = runner.now("1:2");
    vi.advanceTimersByTime(200);
    expect(calls.map((c) => c.query)).toEqual(["1:2"]);
    calls[0]?.resolve([hit("1:2")]);
    expect(await now).toEqual([hit("1:2")]);
    expect(results).toEqual([{ query: "1:2", hits: [hit("1:2")] }]);
  });

  it("drops the pending debounce and late answers after dispose", async () => {
    const { calls, search } = deferred();
    const results: SearchResult[] = [];
    const runner = createSearchRunner(search, (r) => results.push(r), 100);
    const early = runner.now("1:1");
    runner.later("1:2");
    runner.dispose();
    vi.advanceTimersByTime(200);
    calls[0]?.resolve([hit("1:1")]);
    expect(await early).toBeUndefined();
    expect(calls).toHaveLength(1);
    expect(results).toEqual([]);
  });

  it("reports a failed search without a result", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const results: SearchResult[] = [];
    const runner = createSearchRunner(() => Promise.reject(new Error("gone")), (r) => results.push(r), 100);
    expect(await runner.now("1:1")).toBeUndefined();
    expect(results).toEqual([]);
    expect(errors).toHaveBeenCalledWith("fignya: search: Error: gone");
    errors.mockRestore();
  });
});
