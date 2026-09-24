const MAX_THUMB_SCALE = 0.5;
const MAX_THUMB_SIDE = 4096;

export const thumbScale = (width: number, height: number): number =>
  Math.min(MAX_THUMB_SCALE, MAX_THUMB_SIDE / Math.max(width, height, 1));
