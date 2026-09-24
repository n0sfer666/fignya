import { setTimeout as sleep } from "node:timers/promises";

export type Pace = { sliceMs: number; pauseMs: number };

export const IMPORT_PACE: Pace = { sliceMs: 20, pauseMs: 20 };

export const paced = async <P, T>(steps: Generator<P, T>, pace: Pace, onSlice: (progress: P) => void): Promise<T> => {
  let sliceStart = performance.now();
  for (let step = steps.next(); ; step = steps.next()) {
    if (step.done) return step.value;
    if (performance.now() - sliceStart < pace.sliceMs) continue;
    onSlice(step.value);
    await sleep(pace.pauseMs);
    sliceStart = performance.now();
  }
};
