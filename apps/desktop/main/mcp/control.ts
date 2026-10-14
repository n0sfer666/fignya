import { hasErrorCode } from "../../shared/error-code";
import { errorMessage } from "../../shared/error-message";
import type { AgentDeps } from "./agent-deps";
import { claudeCommand, newToken, readMcpConfig, writeMcpConfig, type McpConfig } from "./config";
import { startMcpHttp, type McpHttp } from "./http";
import type { McpLog } from "./log";
import { createPresence } from "./presence";
import { createMcpServer } from "./server";
import { toolRunner } from "./tool-run";

export type McpUi = {
  connected: (connected: boolean) => void;
  enabled: (enabled: boolean) => void;
  busy: (port: number) => void;
  failed: (message: string) => void;
  copy: (text: string) => void;
};

export type McpControlOptions = { configPath: string; port: number; version: string; deps: AgentDeps; log: McpLog; ui: McpUi };

export type McpControl = {
  start: () => Promise<void>;
  toggle: (enabled: boolean) => Promise<void>;
  copyCommand: () => Promise<void>;
  resetToken: () => Promise<void>;
  stop: () => Promise<void>;
};

export const createMcpControl = ({ configPath, port, version, deps, log, ui }: McpControlOptions): McpControl => {
  const presence = createPresence(ui.connected);
  const run = toolRunner(log, presence.touch);
  let config: Promise<McpConfig> | undefined;
  let running: McpHttp | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  const serial = (task: () => Promise<void>): Promise<void> => {
    const next = queue.then(task, task);
    queue = next.catch(() => undefined);
    return next;
  };

  const loaded = (): Promise<McpConfig> => {
    config ??= readMcpConfig(configPath).then(async (stored) => {
      if (stored) return stored;
      const created = { enabled: false, token: newToken() };
      await writeMcpConfig(configPath, created);
      return created;
    });
    config.catch(() => {
      config = undefined;
    });
    return config;
  };

  const save = async (next: McpConfig): Promise<void> => {
    await writeMcpConfig(configPath, next);
    config = Promise.resolve(next);
  };

  const listen = async (token: string): Promise<boolean> => {
    try {
      running = await startMcpHttp({ port, token, server: () => createMcpServer(deps, run, version), presence, log });
      log.event("listening", { port });
      return true;
    } catch (error) {
      log.event("listen-failed", { port, message: errorMessage(error) });
      if (hasErrorCode(error, "EADDRINUSE")) ui.busy(port);
      else ui.failed(errorMessage(error));
      return false;
    }
  };

  const halt = async (): Promise<void> => {
    const stopping = running;
    running = undefined;
    if (!stopping) return;
    await stopping.close();
    log.event("stopped");
  };

  const switched = async (enabled: boolean, token: () => Promise<string>): Promise<boolean> => {
    let listening = false;
    try {
      const current = await token();
      await halt();
      listening = enabled && (await listen(current));
    } finally {
      ui.enabled(listening);
    }
    return listening;
  };

  return {
    start: () =>
      serial(async () => {
        const current = await loaded();
        ui.enabled(current.enabled && (await listen(current.token)));
      }),
    toggle: (enabled) =>
      serial(async () => {
        const listening = await switched(enabled, async () => (await loaded()).token);
        if (listening || !enabled) await save({ ...(await loaded()), enabled });
      }),
    copyCommand: () =>
      serial(async () => {
        ui.copy(claudeCommand(port, (await loaded()).token));
      }),
    resetToken: () =>
      serial(async () => {
        const current = { ...(await loaded()), token: newToken() };
        await save(current);
        if (running) await switched(true, () => Promise.resolve(current.token));
      }),
    stop: () => serial(halt),
  };
};
