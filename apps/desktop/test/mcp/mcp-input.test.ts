import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { readJson } from "../../main/mcp/body";
import { MCP_DEFAULT_PORT, mcpPort } from "../../main/mcp/port";

describe("mcp port", () => {
  it("takes FIGNYA_MCP_PORT when it is a port number", () => {
    expect(mcpPort(undefined)).toBe(MCP_DEFAULT_PORT);
    expect(mcpPort("7400")).toBe(7400);
    for (const value of ["", "0", "65536", "80.5", "abc"]) expect(mcpPort(value)).toBe(MCP_DEFAULT_PORT);
  });
});

describe("mcp body", () => {
  it("parses json and refuses broken or oversized bodies", async () => {
    expect(await readJson(Readable.from([Buffer.from('{"a":'), Buffer.from("1}")]))).toEqual({ ok: true, body: { a: 1 } });
    expect(await readJson(Readable.from([Buffer.from("{")]))).toMatchObject({ ok: false, status: 400 });
    expect(await readJson(Readable.from([Buffer.from("[1,2,3]")]), 4)).toMatchObject({ ok: false, status: 413 });
  });

  it("stops reading once the body is over the limit", async () => {
    let pulled = 0;
    const chunks = async function* () {
      for (;;) {
        pulled += 1;
        yield Buffer.from("xxxx");
      }
    };
    expect(await readJson(chunks(), 10)).toMatchObject({ ok: false, status: 413 });
    expect(pulled).toBe(3);
  });
});
