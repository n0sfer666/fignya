import { protocol } from "electron";
import { imageMime } from "@fignya/fig-import";
import { parseAssetUrl, SCHEME, type AssetRequest } from "../shared/urls";

export type AssetSource = (request: AssetRequest) => Promise<Uint8Array | undefined>;

export const registerScheme = (): void => {
  protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
};

export const serveAssets = (source: AssetSource): void => {
  protocol.handle(SCHEME, async (request) => {
    const asset = parseAssetUrl(request.url);
    const body = asset ? await source(asset).catch((error: unknown) => console.error(`fignya: ${request.url}: ${String(error)}`)) : undefined;
    if (!asset || !body) return new Response("not found", { status: 404 });
    const type = asset.kind === "image" ? imageMime(body) : "image/png";
    return new Response(new Uint8Array(body), { headers: { "Content-Type": type } });
  });
};
