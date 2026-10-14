export const DOUBLE_CLICK_MS = 500;

export type Tap = { time: number; x: number; y: number };

export const isDoubleClick = (prev: Tap | undefined, next: Tap, slop: number): boolean =>
  prev !== undefined && next.time - prev.time <= DOUBLE_CLICK_MS && Math.hypot(next.x - prev.x, next.y - prev.y) <= slop;
