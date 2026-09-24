import { describe, expect, it } from "vitest";
import { pendingRequests } from "../main/pending-requests";

describe("pendingRequests", () => {
  it("resolves each request by its id", async () => {
    const pending = pendingRequests<string>();
    const ids: number[] = [];
    const first = pending.ask((id) => ids.push(id));
    const second = pending.ask((id) => ids.push(id));
    const [a = 0, b = 0] = ids;
    pending.settle(b, "second");
    pending.settle(a, "first");
    expect(await Promise.all([first, second])).toEqual(["first", "second"]);
  });

  it("rejects a single request by its id", async () => {
    const pending = pendingRequests<string>();
    let reqId = 0;
    const asked = pending.ask((id) => {
      reqId = id;
    });
    pending.reject(reqId, new Error("refused"));
    await expect(asked).rejects.toThrow("refused");
  });

  it("rejects waiting and later requests after failure", async () => {
    const pending = pendingRequests<string>();
    const waiting = pending.ask(() => undefined);
    pending.fail(new Error("gone"));
    await expect(waiting).rejects.toThrow("gone");
    await expect(pending.ask(() => undefined)).rejects.toThrow("gone");
  });
});
