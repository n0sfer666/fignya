import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { refusal } from "./auth";
import { readJson } from "./body";
import type { McpLog } from "./log";
import type { Presence } from "./presence";

export type McpHttpOptions = { port: number; token: string; server: () => McpServer; presence: Presence; log: McpLog };

export type McpHttp = { close: () => Promise<void> };

export const MAX_SESSIONS = 8;

const PRESENCE_TICK_MS = 15_000;

const reply = (res: ServerResponse, status: number, message: string, headers: Record<string, string> = {}): void => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));
};

export const startMcpHttp = ({ port, token, server, presence, log }: McpHttpOptions): Promise<McpHttp> => {
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  const evictOldest = async (): Promise<void> => {
    const [oldest] = sessions.values();
    if (sessions.size < MAX_SESSIONS || !oldest) return;
    await oldest.close();
  };

  const open = async (req: IncomingMessage, res: ServerResponse, body: unknown): Promise<void> => {
    await evictOldest();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: randomUUID,
      onsessioninitialized: (id) => {
        sessions.set(id, transport);
        log.event("session-opened", { sessions: sessions.size });
      },
    });
    transport.onclose = () => {
      if (transport.sessionId && sessions.delete(transport.sessionId)) log.event("session-closed", { sessions: sessions.size });
    };
    await server().connect(transport);
    await transport.handleRequest(req, res, body);
  };

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const refused = refusal(req.headers, req.url, port, token);
    if (refused) {
      log.event("refused", { status: refused.status });
      reply(res, refused.status, refused.message, refused.status === 401 ? { "WWW-Authenticate": 'Bearer realm="fignya"' } : {});
      return;
    }
    presence.touch();
    const header = req.headers["mcp-session-id"];
    const known = typeof header === "string" ? sessions.get(header) : undefined;
    if (req.method !== "POST") {
      if (!known) return reply(res, header === undefined ? 400 : 404, "unknown or missing session");
      if (req.method === "GET") res.on("close", presence.streamOpened());
      return known.handleRequest(req, res);
    }
    const read = await readJson({ [Symbol.asyncIterator]: () => req.iterator({ destroyOnReturn: false }) });
    if (!read.ok) return reply(res, read.status, read.message, { Connection: "close" });
    if (known) return known.handleRequest(req, res, read.body);
    if (header !== undefined) return reply(res, 404, "unknown session");
    if (!isInitializeRequest(read.body)) return reply(res, 400, "the first request must be initialize");
    return open(req, res, read.body);
  };

  const http = createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      log.event("failed", { message: String(error) });
      if (res.headersSent) res.end();
      else reply(res, 500, "internal error");
    });
  });
  const tick = setInterval(presence.tick, PRESENCE_TICK_MS);
  tick.unref();

  const close = async (): Promise<void> => {
    clearInterval(tick);
    await Promise.all([...sessions.values()].map((transport) => transport.close()));
    sessions.clear();
    presence.reset();
    const closed = new Promise<void>((resolve) => http.close(() => resolve()));
    http.closeAllConnections();
    await closed;
  };

  return new Promise((resolve, reject) => {
    const failed = (error: Error): void => {
      clearInterval(tick);
      reject(error);
    };
    http.once("error", failed);
    http.listen(port, "127.0.0.1", () => {
      http.off("error", failed);
      http.on("error", (error) => log.event("failed", { message: error.message }));
      resolve({ close });
    });
  });
};
