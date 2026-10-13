import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { settleTimer } from "../renderer/src/canvas/settle-timer";

describe("settleTimer", () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it("runs once the view has been still for the settle time", () => {
    const run = vi.fn();
    const timer = settleTimer(200, run);
    timer.restart();
    vi.advanceTimersByTime(150);
    timer.restart();
    vi.advanceTimersByTime(150);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("is not postponed by a stream of loads that arrive faster than the settle time", () => {
    const run = vi.fn();
    const timer = settleTimer(200, run);
    timer.restart();
    for (let i = 0; i < 10; i += 1) {
      vi.advanceTimersByTime(80);
      timer.ensure();
    }
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("does not run after cancel", () => {
    const run = vi.fn();
    const timer = settleTimer(200, run);
    timer.ensure();
    timer.cancel();
    vi.advanceTimersByTime(500);
    expect(run).not.toHaveBeenCalled();
  });

  it("lets a gesture postpone a run that a load has armed", () => {
    const run = vi.fn();
    const timer = settleTimer(200, run);
    timer.ensure();
    vi.advanceTimersByTime(150);
    timer.restart();
    vi.advanceTimersByTime(150);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("arms again after cancel", () => {
    const run = vi.fn();
    const timer = settleTimer(200, run);
    timer.ensure();
    timer.cancel();
    timer.ensure();
    vi.advanceTimersByTime(200);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
