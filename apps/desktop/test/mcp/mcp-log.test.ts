import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createMcpLog, LOG_LIMIT } from "../../main/mcp/log";

const NOW = new Date("2026-10-14T10:00:00.000Z");

const logPath = async (): Promise<string> => join(await mkdtemp(join(tmpdir(), "fignya-log-")), "logs", "mcp.log");

describe("mcp log", () => {
  it("appends json lines owned by the user", async () => {
    const path = await logPath();
    const log = createMcpLog(path, () => NOW);
    log.tool({ tool: "outline", addresses: ["1:2"], ok: true, ms: 3, bytes: 40 });
    log.event("listening", { port: 7341 });
    await vi.waitFor(async () => expect((await readFile(path, "utf8")).split("\n")).toHaveLength(3));
    const [first, second] = (await readFile(path, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    expect(first).toEqual({ time: NOW.toISOString(), tool: "outline", addresses: ["1:2"], ok: true, ms: 3, bytes: 40 });
    expect(second).toEqual({ time: NOW.toISOString(), event: "listening", port: 7341 });
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });

  it("rotates into one backup past the limit", async () => {
    const path = await logPath();
    const log = createMcpLog(path, () => NOW);
    log.event("first");
    await vi.waitFor(async () => expect((await stat(path)).size).toBeGreaterThan(0));
    await writeFile(path, "x".repeat(LOG_LIMIT - 10));
    log.event("rotated");
    await vi.waitFor(async () => expect(await readFile(path, "utf8")).toContain('"rotated"'));
    expect((await stat(`${path}.1`)).size).toBe(LOG_LIMIT - 10);
    expect((await readFile(path, "utf8")).split("\n")).toHaveLength(2);
  });
});
