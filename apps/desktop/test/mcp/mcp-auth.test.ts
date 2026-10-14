import { describe, expect, it } from "vitest";
import { refusal } from "../../main/mcp/auth";

const TOKEN = "a".repeat(64);
const good = { host: "127.0.0.1:7341", authorization: `Bearer ${TOKEN}` };

describe("mcp auth", () => {
  it("lets a local request with the token through", () => {
    expect(refusal(good, "/mcp", 7341, TOKEN)).toBeUndefined();
    expect(refusal({ ...good, host: "localhost:7341" }, "/mcp?x=1", 7341, TOKEN)).toBeUndefined();
  });

  it("answers 401 without or with a foreign token", () => {
    expect(refusal({ host: good.host }, "/mcp", 7341, TOKEN)?.status).toBe(401);
    expect(refusal({ ...good, authorization: `Bearer ${"b".repeat(64)}` }, "/mcp", 7341, TOKEN)?.status).toBe(401);
    expect(refusal({ ...good, authorization: `Bearer ${TOKEN}x` }, "/mcp", 7341, TOKEN)?.status).toBe(401);
    expect(refusal({ ...good, authorization: TOKEN }, "/mcp", 7341, TOKEN)?.status).toBe(401);
  });

  it("answers 403 to a foreign Host or any Origin", () => {
    expect(refusal({ ...good, host: "evil.test:7341" }, "/mcp", 7341, TOKEN)?.status).toBe(403);
    expect(refusal({ ...good, host: "127.0.0.1:80" }, "/mcp", 7341, TOKEN)?.status).toBe(403);
    expect(refusal({ ...good, origin: "http://127.0.0.1:7341" }, "/mcp", 7341, TOKEN)?.status).toBe(403);
    expect(refusal({ ...good, origin: "null" }, "/mcp", 7341, TOKEN)?.status).toBe(403);
  });

  it("checks the Origin before the token", () => {
    expect(refusal({ host: good.host, origin: "https://evil.test" }, "/mcp", 7341, TOKEN)?.status).toBe(403);
  });

  it("answers 404 off the mcp path", () => {
    expect(refusal(good, "/", 7341, TOKEN)?.status).toBe(404);
    expect(refusal(good, "/mcp/x", 7341, TOKEN)?.status).toBe(404);
  });
});
