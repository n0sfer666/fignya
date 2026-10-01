import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redecoding } from "../renderer/src/redecoding";

const hanging = (): Promise<void> => new Promise(() => undefined);

const deferred = (): { promise: Promise<void>; resolve: () => void; reject: (error: Error) => void } => {
  let resolve = (): void => undefined;
  let reject = (_error: Error): void => undefined;
  const promise = new Promise<void>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
};

describe("redecoding", () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it("resolves with the first decode and never calls it again", async () => {
    const decode = vi.fn(() => Promise.resolve());
    await expect(redecoding(decode, 500)).resolves.toBeUndefined();
    expect(decode).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("calls decode again when the first one hangs and settles with the second", async () => {
    const decode = vi.fn<() => Promise<void>>().mockImplementationOnce(hanging).mockImplementationOnce(() => Promise.resolve());
    let done = false;
    const waiting = redecoding(decode, 500).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(499);
    expect(decode).toHaveBeenCalledTimes(1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(decode).toHaveBeenCalledTimes(2);
  });

  it("settles with the first decode when it finishes after the second has started", async () => {
    const first = deferred();
    const decode = vi.fn<() => Promise<void>>().mockImplementationOnce(() => first.promise).mockImplementationOnce(hanging);
    const waiting = redecoding(decode, 500);
    await vi.advanceTimersByTimeAsync(500);
    first.resolve();
    await expect(waiting).resolves.toBeUndefined();
    expect(decode).toHaveBeenCalledTimes(2);
  });

  it("ignores a late failure of the first decode while the second may still succeed", async () => {
    const first = deferred();
    const second = deferred();
    const decode = vi.fn<() => Promise<void>>().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const waiting = redecoding(decode, 500);
    await vi.advanceTimersByTimeAsync(500);
    first.reject(new Error("late"));
    second.resolve();
    await expect(waiting).resolves.toBeUndefined();
  });

  it("calls decode at most twice when both hang", async () => {
    const decode = vi.fn(hanging);
    let done = false;
    void redecoding(decode, 500).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(10000);
    expect(decode).toHaveBeenCalledTimes(2);
    expect(done).toBe(false);
  });

  it("passes a failed first decode through without retrying", async () => {
    const decode = vi.fn(() => Promise.reject(new Error("broken")));
    await expect(redecoding(decode, 500)).rejects.toThrow("broken");
    expect(decode).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects with the last failure once both decodes have failed", async () => {
    const first = deferred();
    const decode = vi.fn<() => Promise<void>>().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => Promise.reject(new Error("again")));
    const waiting = expect(redecoding(decode, 500)).rejects.toThrow("first");
    await vi.advanceTimersByTimeAsync(500);
    first.reject(new Error("first"));
    await waiting;
  });

  it("turns a decode that throws into a rejection", async () => {
    const throwing = (): Promise<void> => {
      throw new Error("sync");
    };
    await expect(redecoding(throwing, 500)).rejects.toThrow("sync");
    expect(vi.getTimerCount()).toBe(0);
  });
});
