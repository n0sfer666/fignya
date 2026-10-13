import { protocol } from "electron";
import { imageMime } from "@fignya/fig-import";
import { parseAssetUrl, SCHEME, type AssetRequest } from "../shared/urls";

export type AssetSource = (request: AssetRequest) => Promise<Uint8Array | undefined>;

export const registerScheme = (): void => {
  protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
};

const FONT_TYPES: Record<string, string> = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };

const headersOf = (asset: AssetRequest, body: Uint8Array): Record<string, string> => {
  if (asset.kind === "image") return { "Content-Type": imageMime(body) };
  if (asset.kind === "thumb") return { "Content-Type": "image/png" };
  return { "Content-Type": FONT_TYPES[asset.id.split(".").pop() ?? ""] ?? "application/octet-stream", "Access-Control-Allow-Origin": "*" };
};

export const serveAssets = (source: AssetSource): void => {
  protocol.handle(SCHEME, async (request) => {
    const asset = parseAssetUrl(request.url);
    const body = asset ? await source(asset).catch((error: unknown) => console.error(`fignya: ${request.url}: ${String(error)}`)) : undefined;
    if (!asset || !body) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(body), { headers: headersOf(asset, body) });
  });
};
