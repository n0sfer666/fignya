import { protocol } from "electron";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

export const SCHEME = "fignya";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export const registerScheme = (): void => {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ]);
};

export type Hooks = Record<string, (url: URL) => void>;

const serveFile = async (path: string): Promise<Response> => {
  try {
    const body = await readFile(path);
    return new Response(body, { headers: { "Content-Type": MIME[extname(path)] ?? "application/octet-stream" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
};

export const serveDist = (dist: string, hooks: Hooks): void => {
  protocol.handle(SCHEME, (request) => {
    const url = new URL(request.url);
    const hook = hooks[url.pathname];
    if (hook) {
      hook(url);
      return new Response("ok");
    }
    return serveFile(join(dist, decodeURIComponent(url.pathname)));
  });
};

export const pageUrl = (path: string): string => `${SCHEME}://localhost/${path}`;
