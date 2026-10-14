import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readMcpConfig } from "../../main/mcp/config";
import { createMcpControl, type McpControl, type McpUi } from "../../main/mcp/control";
import { silentLog } from "./connect";
import { fakeDeps } from "./fake-deps";
import { freePort } from "./free-port";

const ui = (): McpUi => ({ connected: vi.fn(), enabled: vi.fn(), busy: vi.fn(), failed: vi.fn(), copy: vi.fn() });

let control: McpControl | undefined;

const setup = async (port?: number) => {
  const configPath = join(await mkdtemp(join(tmpdir(), "fignya-control-")), "mcp.json");
  const shown = ui();
  const chosen = port ?? (await freePort());
  control = createMcpControl({ configPath, port: chosen, version: "test", deps: fakeDeps().deps, log: silentLog, ui: shown });
  return { control, configPath, shown, port: chosen };
};

const health = (port: number): Promise<number> => fetch(`http://127.0.0.1:${port}/mcp`, { method: "POST" }).then((res) => res.status);

afterEach(async () => {
  await control?.stop();
  control = undefined;
});

describe("mcp control", () => {
  it("stays off by default and creates a token", async () => {
    const { control, configPath, shown, port } = await setup();
    await control.start();
    expect(shown.enabled).toHaveBeenCalledWith(false);
    expect(await readMcpConfig(configPath)).toMatchObject({ enabled: false });
    await expect(health(port)).rejects.toThrow();
  });

  it("remembers the switch and serves while enabled", async () => {
    const { control, configPath, shown, port } = await setup();
    await control.toggle(true);
    expect(shown.enabled).toHaveBeenLastCalledWith(true);
    expect(await readMcpConfig(configPath)).toMatchObject({ enabled: true });
    expect(await health(port)).toBe(401);
    await control.toggle(false);
    expect(await readMcpConfig(configPath)).toMatchObject({ enabled: false });
    await expect(health(port)).rejects.toThrow();
  });

  it("reports a busy port and keeps the server off", async () => {
    const port = await freePort();
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(port, "127.0.0.1", resolve));
    const { control, configPath, shown } = await setup(port);
    await control.toggle(true);
    blocker.close();
    expect(shown.busy).toHaveBeenCalledWith(port);
    expect(shown.enabled).toHaveBeenLastCalledWith(false);
    expect(await readMcpConfig(configPath)).toMatchObject({ enabled: false });
  });

  it("copies the command with the current token and resets it", async () => {
    const { control, configPath, shown, port } = await setup();
    await control.toggle(true);
    await control.copyCommand();
    const before = (await readMcpConfig(configPath))?.token ?? "";
    expect(shown.copy).toHaveBeenCalledWith(expect.stringContaining(`127.0.0.1:${port}/mcp`));
    expect(shown.copy).toHaveBeenCalledWith(expect.stringContaining(before));
    await control.resetToken();
    const after = (await readMcpConfig(configPath))?.token;
    expect(after).toMatch(/^[0-9a-f]{64}$/);
    expect(after).not.toBe(before);
    expect(await health(port)).toBe(401);
  });
});
