export const BASE_TIER = 0.5;

const MAX_TIER = 2;

export const TIERS: readonly number[] = [BASE_TIER, 1, MAX_TIER];

export const isTier = (value: number): boolean => TIERS.includes(value);

export const tierFor = (density: number): number => TIERS.find((tier) => tier >= density) ?? MAX_TIER;
