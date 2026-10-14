import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { hasErrorCode } from "../../shared/error-code";
import { writeAtomic } from "../write-atomic";

export type McpConfig = { enabled: boolean; token: string };

const TOKEN_BYTES = 32;

const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

const OWNER_ONLY = 0o600;

export const newToken = (): string => randomBytes(TOKEN_BYTES).toString("hex");

const parsed = (text: string): McpConfig | undefined => {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || !("enabled" in value) || !("token" in value)) return undefined;
    const { enabled, token } = value;
    return typeof enabled === "boolean" && typeof token === "string" && TOKEN_PATTERN.test(token) ? { enabled, token } : undefined;
  } catch {
    return undefined;
  }
};

const missingAsUndefined = (error: unknown): undefined => {
  if (hasErrorCode(error, "ENOENT")) return undefined;
  throw error;
};

export const readMcpConfig = async (path: string): Promise<McpConfig | undefined> => {
  const text = await readFile(path, "utf8").catch(missingAsUndefined);
  return text === undefined ? undefined : parsed(text);
};

export const writeMcpConfig = async (path: string, config: McpConfig): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeAtomic(path, JSON.stringify(config), OWNER_ONLY);
  await chmod(path, OWNER_ONLY);
};

export const claudeCommand = (port: number, token: string): string =>
  `claude mcp add --transport http fignya http://127.0.0.1:${port}/mcp --header "Authorization: Bearer ${token}"`;
