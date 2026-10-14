import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { AgentDeps } from "../agent-deps";
import type { ToolRun } from "../tool-run";

export type RegisterTool = (server: McpServer, deps: AgentDeps, run: ToolRun) => void;

export const READ_ONLY: ToolAnnotations = { readOnlyHint: true, openWorldHint: false };

export const UI_ONLY: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export const EDITS: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
