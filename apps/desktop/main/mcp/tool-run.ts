import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errorMessage } from "../../shared/error-message";
import type { McpLog } from "./log";
import { failure, firstText } from "./tool-result";

export type ToolRun = (tool: string, addresses: string[], run: () => Promise<CallToolResult>) => Promise<CallToolResult>;

export const toolRunner =
  (log: McpLog, touch: () => void): ToolRun =>
  async (tool, addresses, run) => {
    const started = performance.now();
    touch();
    const result = await run().catch((error: unknown) => failure(errorMessage(error)));
    const ms = Math.round(performance.now() - started);
    const bytes = JSON.stringify(result).length;
    log.tool({ tool, addresses, ok: result.isError !== true, ...(result.isError ? { error: firstText(result) } : {}), ms, bytes });
    return result;
  };
