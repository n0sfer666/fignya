export type FrameStats = {
  frames: number;
  fps: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  janky: number;
};

const round = (n: number): number => Number(n.toFixed(2));

const stats = (deltas: number[], totalMs: number, interval: number): FrameStats => {
  const sorted = [...deltas].sort((a, b) => a - b);
  const q = (p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
  return {
    frames: deltas.length,
    fps: round((deltas.length * 1000) / totalMs),
    p50: round(q(0.5)),
    p95: round(q(0.95)),
    p99: round(q(0.99)),
    max: round(sorted[sorted.length - 1] ?? 0),
    janky: deltas.filter((d) => d > interval * 1.5).length,
  };
};

export const animate = (durationMs: number, interval: number, step: (t: number) => void): Promise<FrameStats> =>
  new Promise((resolve) => {
    const deltas: number[] = [];
    let start = 0;
    let last = 0;
    const tick = (now: number): void => {
      if (start === 0) start = now;
      else deltas.push(now - last);
      last = now;
      const t = (now - start) / durationMs;
      if (t >= 1) {
        resolve(stats(deltas, now - start, interval || 1000 / 60));
        return;
      }
      step(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
