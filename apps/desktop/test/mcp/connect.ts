import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { AgentDeps } from "../../main/mcp/agent-deps";
import type { McpLog } from "../../main/mcp/log";
import { createMcpServer } from "../../main/mcp/server";
import { toolRunner } from "../../main/mcp/tool-run";

export const silentLog: McpLog = { tool: () => undefined, event: () => undefined };

export const connect = async (deps: AgentDeps, log: McpLog = silentLog) => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createMcpServer(deps, toolRunner(log, () => undefined), "test").connect(serverSide);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(clientSide);
  const call = async (name: string, args: Record<string, unknown> = {}): Promise<CallToolResult> =>
    CallToolResultSchema.parse(await client.callTool({ name, arguments: args }));
  return { client, call };
};

export const textOf = (result: CallToolResult): string => {
  const first = result.content[0];
  return first?.type === "text" ? first.text : "";
};
