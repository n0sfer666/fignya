import { TIERS } from "../shared/thumb-tiers";

const MAX_THUMB_SIDE = 4096;

export const thumbScale = (width: number, height: number, tier: number): number =>
  Math.min(tier, MAX_THUMB_SIDE / Math.max(width, height, 1));

export const effectiveTier = (width: number, height: number, tier: number): number =>
  TIERS.find((candidate) => thumbScale(width, height, candidate) >= thumbScale(width, height, tier)) ?? tier;
