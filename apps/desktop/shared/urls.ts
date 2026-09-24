export const SCHEME = "fignya";

export type AssetRequest = { kind: "image" | "thumb"; id: string };

export const imageUrl = (hash: string): string => `${SCHEME}://image/${encodeURIComponent(hash)}`;

export const thumbUrl = (screenId: string): string => `${SCHEME}://thumb/${encodeURIComponent(screenId)}`;

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
  if (!id || (kind !== "image" && kind !== "thumb")) return undefined;
  return { kind, id };
};
