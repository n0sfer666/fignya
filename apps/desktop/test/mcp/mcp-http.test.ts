import { request } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, it } from "vitest";
import { MAX_BODY_BYTES } from "../../main/mcp/body";
import { startMcpHttp, MAX_SESSIONS, type McpHttp } from "../../main/mcp/http";
import { createPresence } from "../../main/mcp/presence";
import { createMcpServer } from "../../main/mcp/server";
import { toolRunner } from "../../main/mcp/tool-run";
import { silentLog } from "./connect";
import { fakeDeps } from "./fake-deps";
import { freePort } from "./free-port";

const TOKEN = "c".repeat(64);

type Answer = { status: number; body: string };

const post = (port: number, headers: Record<string, string>, body = "{}"): Promise<Answer> =>
  new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path: "/mcp", method: "POST", headers: { "Content-Type": "application/json", ...headers } }, (res) => {
      let text = "";
      res.on("data", (chunk: Buffer) => (text += chunk.toString()));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: text }));
    });
    req.on("error", reject);
    req.end(body);
  });

const client = async (port: number, token = TOKEN): Promise<Client> => {
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  const connected = new Client({ name: "test", version: "1" });
  await connected.connect(transport);
  return connected;
};

let running: McpHttp | undefined;

const serve = async (connected: (value: boolean) => void = () => undefined): Promise<number> => {
  const port = await freePort();
  const deps = fakeDeps().deps;
  running = await startMcpHttp({
    port,
    token: TOKEN,
    server: () => createMcpServer(deps, toolRunner(silentLog, () => undefined), "test"),
    presence: createPresence(connected),
    log: silentLog,
  });
  return port;
};

afterEach(async () => {
  await running?.close();
  running = undefined;
});

describe("mcp http", () => {
  it("serves tools to a client with the token", async () => {
    const shown: boolean[] = [];
    const port = await serve((value) => shown.push(value));
    const agent = await client(port);
    expect((await agent.listTools()).tools.length).toBe(10);
    expect(shown).toEqual([true]);
    await agent.close();
  });

  it("refuses without the token, with a foreign Host and with an Origin", async () => {
    const port = await serve();
    expect((await post(port, {})).status).toBe(401);
    expect((await post(port, { Authorization: `Bearer ${TOKEN}`, Host: `evil.test:${port}` })).status).toBe(403);
    expect((await post(port, { Authorization: `Bearer ${TOKEN}`, Origin: "https://evil.test" })).status).toBe(403);
    await expect(client(port, "d".repeat(64))).rejects.toThrow();
  });

  it("asks for initialize first and rejects broken bodies", async () => {
    const port = await serve();
    const auth = { Authorization: `Bearer ${TOKEN}`, Accept: "application/json, text/event-stream" };
    expect((await post(port, auth, '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')).status).toBe(400);
    expect((await post(port, auth, "{")).status).toBe(400);
    expect((await post(port, { ...auth, "Mcp-Session-Id": "nope" }, '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')).status).toBe(404);
    expect((await post(port, auth, " ".repeat(MAX_BODY_BYTES + 1))).status).toBe(413);
  });

  it("evicts the oldest session past the limit", async () => {
    const port = await serve();
    const agents = [];
    for (let index = 0; index <= MAX_SESSIONS; index += 1) agents.push(await client(port));
    await expect(agents[0]?.listTools()).rejects.toThrow();
    expect((await agents.at(-1)?.listTools())?.tools.length).toBe(10);
    await Promise.all(agents.map((agent) => agent.close()));
  });
});
