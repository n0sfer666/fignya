import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodedWithin } from "../renderer/src/canvas/decoded-within";

const hanging = (): Promise<void> => new Promise(() => undefined);

describe("decodedWithin", () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it("resolves as soon as the decode does", async () => {
    await expect(decodedWithin(() => Promise.resolve(), 1000)).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("gives up waiting on a decode that never settles", async () => {
    let done = false;
    const waiting = decodedWithin(hanging, 1000).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(done).toBe(true);
  });

  it("passes a failed decode through", async () => {
    await expect(decodedWithin(() => Promise.reject(new Error("broken")), 1000)).rejects.toThrow("broken");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("turns a decode that throws into a rejection", async () => {
    const throwing = (): Promise<void> => {
      throw new Error("sync");
    };
    await expect(decodedWithin(throwing, 1000)).rejects.toThrow("sync");
    expect(vi.getTimerCount()).toBe(0);
  });
});
