import { mkdir, mkdtemp, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { claudeCommand, newToken, readMcpConfig, writeMcpConfig } from "../../main/mcp/config";

const tempPath = async (): Promise<string> => join(await mkdtemp(join(tmpdir(), "fignya-mcp-")), "nested", "mcp.json");

describe("mcp config", () => {
  it("writes the config readable by the owner only and reads it back", async () => {
    const path = await tempPath();
    const config = { enabled: true, token: newToken() };
    await writeMcpConfig(path, config);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect(await readMcpConfig(path)).toEqual(config);
  });

  it("tightens the mode of an existing file", async () => {
    const path = await tempPath();
    await writeMcpConfig(path, { enabled: false, token: newToken() });
    await writeFile(path, "{}", { mode: 0o644 });
    await writeMcpConfig(path, { enabled: false, token: newToken() });
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });

  it("treats a missing or broken config as absent", async () => {
    const path = await tempPath();
    expect(await readMcpConfig(path)).toBeUndefined();
    await writeMcpConfig(path, { enabled: true, token: newToken() });
    for (const text of ["{", "[]", '{"enabled":true}', '{"enabled":"yes","token":"x"}', `{"enabled":true,"token":"${"g".repeat(64)}"}`]) {
      await writeFile(path, text);
      expect(await readMcpConfig(path)).toBeUndefined();
    }
  });

  it("fails on an unreadable config instead of replacing it", async () => {
    const path = await tempPath();
    await mkdir(path, { recursive: true });
    await expect(readMcpConfig(path)).rejects.toThrow();
  });

  it("makes 32 byte hex tokens and a ready Claude Code command", () => {
    const token = newToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(newToken()).not.toBe(token);
    expect(claudeCommand(7341, token)).toBe(
      `claude mcp add --transport http fignya http://127.0.0.1:7341/mcp --header "Authorization: Bearer ${token}"`,
    );
  });
});
