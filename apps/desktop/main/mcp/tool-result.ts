import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const textResult = (text: string): CallToolResult => ({ content: [{ type: "text", text }] });

export const jsonResult = (value: unknown): CallToolResult => textResult(JSON.stringify(value));

export const failure = (text: string): CallToolResult => ({ content: [{ type: "text", text }], isError: true });

export const firstText = (result: CallToolResult): string => {
  const first = result.content[0];
  return first?.type === "text" ? first.text : "";
};
