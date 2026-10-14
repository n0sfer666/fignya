import { appendFile, mkdir, rename, stat } from "node:fs/promises";
import { dirname } from "node:path";

export type ToolEntry = { tool: string; addresses: string[]; ok: boolean; error?: string; ms: number; bytes: number };

export type McpLog = {
  tool: (entry: ToolEntry) => void;
  event: (event: string, fields?: Record<string, string | number>) => void;
};

export const LOG_LIMIT = 5 * 1024 * 1024;

export const createMcpLog = (path: string, now: () => Date = () => new Date()): McpLog => {
  let chain: Promise<void> = Promise.resolve();
  const append = async (line: string): Promise<void> => {
    await mkdir(dirname(path), { recursive: true });
    const size = await stat(path).then(
      (info) => info.size,
      () => 0,
    );
    if (size > 0 && size + Buffer.byteLength(line) > LOG_LIMIT) await rename(path, `${path}.1`);
    await appendFile(path, line, { mode: 0o600 });
  };
  const write = (fields: Record<string, unknown>): void => {
    const line = `${JSON.stringify({ time: now().toISOString(), ...fields })}\n`;
    chain = chain.then(() => append(line)).catch((error: unknown) => console.error(`fignya: mcp log write failed: ${String(error)}`));
  };
  return { tool: (entry) => write(entry), event: (event, fields = {}) => write({ event, ...fields }) };
};
