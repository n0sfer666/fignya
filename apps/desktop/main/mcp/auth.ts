import { timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

export const MCP_PATH = "/mcp";

export type Refusal = { status: 401 | 403 | 404; message: string };

const BEARER = /^Bearer\s+(\S+)$/i;

const sameSecret = (given: string, token: string): boolean => {
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
};

const pathOf = (url: string | undefined): string | undefined => {
  try {
    return new URL(url ?? "", "http://127.0.0.1").pathname;
  } catch {
    return undefined;
  }
};

export const refusal = (headers: IncomingHttpHeaders, url: string | undefined, port: number, token: string): Refusal | undefined => {
  if (headers.origin !== undefined) return { status: 403, message: "requests with an Origin header are not allowed" };
  if (headers.host !== `127.0.0.1:${port}` && headers.host !== `localhost:${port}`) return { status: 403, message: "unexpected Host header" };
  const bearer = BEARER.exec(headers.authorization ?? "")?.[1];
  if (!bearer || !sameSecret(bearer, token)) return { status: 401, message: "missing or invalid bearer token" };
  if (pathOf(url) !== MCP_PATH) return { status: 404, message: "not found" };
  return undefined;
};
