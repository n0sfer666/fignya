import { BASE_TIER, isTier } from "./thumb-tiers";

export const SCHEME = "fignya";

export type AssetRequest = { kind: "image"; id: string } | { kind: "thumb"; id: string; tier: number };

export const imageUrl = (hash: string): string => `${SCHEME}://image/${encodeURIComponent(hash)}`;

export const thumbUrl = (screenId: string, tier: number = BASE_TIER): string => {
  const url = `${SCHEME}://thumb/${encodeURIComponent(screenId)}`;
  return tier === BASE_TIER ? url : `${url}?tier=${tier}`;
};

const tierOf = (url: URL): number => {
  const tier = Number(url.searchParams.get("tier") ?? BASE_TIER);
  return isTier(tier) ? tier : BASE_TIER;
};

const decode = (value: string): string | undefined => {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
};

export const parseAssetUrl = (raw: string): AssetRequest | undefined => {
  const url = URL.parse(raw);
  if (!url || url.protocol !== `${SCHEME}:`) return undefined;
  const kind = url.hostname;
  const id = decode(url.pathname.slice(1));
  if (!id) return undefined;
  if (kind === "image") return { kind, id };
  return kind === "thumb" ? { kind, id, tier: tierOf(url) } : undefined;
};
