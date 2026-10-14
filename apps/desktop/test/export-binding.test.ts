import { describe, expect, it } from "vitest";
import type { Screen } from "@fignya/model";
import { bindExport, type ExportApi } from "../renderer/src/export-binding";

const screen: Screen = { id: "1:2", name: "Home", x: 0, y: 0, width: 10, height: 10 };

const fakeApi = () => {
  const available: (string | undefined)[] = [];
  const failures: string[] = [];
  let request = (): void => undefined;
  let subscribed = true;
  const api: ExportApi = {
    exportAvailable: (id) => void available.push(id),
    exportFailed: (message) => void failures.push(message),
    onExportRequest: (handler) => {
      request = handler;
      return () => {
        subscribed = false;
      };
    },
  };
  return { api, available, failures, request: () => request(), subscribed: () => subscribed };
};

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("bindExport", () => {
  it("starts unavailable and follows the live screen", () => {
    const fake = fakeApi();
    const binding = bindExport(fake.api, () => [screen], async () => undefined);
    binding.onLive("1:2");
    binding.onLive(undefined);
    expect(fake.available).toEqual([undefined, "1:2", undefined]);
  });

  it("exports the live screen once while an export is running", async () => {
    const fake = fakeApi();
    const runs: string[] = [];
    let finish = (): void => undefined;
    const run = (s: Screen): Promise<void> => {
      runs.push(s.id);
      return new Promise((resolve) => {
        finish = resolve;
      });
    };
    bindExport(fake.api, () => [screen], run).onLive("1:2");
    fake.request();
    fake.request();
    expect(runs).toEqual(["1:2"]);
    finish();
    await settle();
    fake.request();
    expect(runs).toEqual(["1:2", "1:2"]);
  });

  it("ignores requests without a live screen", () => {
    const fake = fakeApi();
    const runs: string[] = [];
    bindExport(fake.api, () => [screen], async (s) => void runs.push(s.id));
    fake.request();
    expect(runs).toEqual([]);
  });

  it("reports a failed export", async () => {
    const fake = fakeApi();
    bindExport(fake.api, () => [screen], async () => Promise.reject(new Error("screen is not loaded"))).onLive("1:2");
    fake.request();
    await settle();
    expect(fake.failures).toEqual(["screen is not loaded"]);
  });

  it("unsubscribes and disables export on dispose", () => {
    const fake = fakeApi();
    const binding = bindExport(fake.api, () => [screen], async () => undefined);
    binding.onLive("1:2");
    binding.dispose();
    expect(fake.subscribed()).toBe(false);
    expect(fake.available.at(-1)).toBeUndefined();
  });
});
