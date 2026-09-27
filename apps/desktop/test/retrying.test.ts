import { describe, expect, it } from "vitest";
import { retrying } from "../main/retrying";

const flaky = (failures: number) => {
  let calls = 0;
  return {
    calls: () => calls,
    run: async (): Promise<string> => {
      calls += 1;
      if (calls <= failures) throw new Error(`fail ${calls}`);
      return "ok";
    },
  };
};

describe("retrying", () => {
  it("retries a failed attempt until it succeeds", async () => {
    const task = flaky(2);
    const seen: unknown[] = [];
    await expect(retrying(3, task.run, (error) => void seen.push(error))).resolves.toBe("ok");
    expect(task.calls()).toBe(3);
    expect(seen).toHaveLength(2);
  });

  it("gives up with the last error after the allowed attempts", async () => {
    const task = flaky(5);
    await expect(retrying(2, task.run, () => undefined)).rejects.toThrow("fail 2");
    expect(task.calls()).toBe(2);
  });
});
