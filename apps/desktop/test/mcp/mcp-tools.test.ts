import { EDIT_KEYS } from "@fignya/model";
import { describe, expect, it, vi } from "vitest";
import type { AgentDeps } from "../../main/mcp/agent-deps";
import { documentGate } from "../../main/mcp/document-gate";
import { connect, textOf } from "./connect";
import { fakeDeps } from "./fake-deps";

const json = (text: string): unknown => JSON.parse(text);

describe("mcp tools", () => {
  it("lists the tools of the slice", async () => {
    const { client } = await connect(fakeDeps().deps);
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(
      ["apply_edits", "document", "inspect", "open_screen", "outline", "screenshot", "search", "select", "selection", "undo_agent_edit"],
    );
  });

  it("exposes every editable style key in the apply_edits schema", async () => {
    const { client } = await connect(fakeDeps().deps);
    const { tools } = await client.listTools();
    const schema = JSON.stringify(tools.find((tool) => tool.name === "apply_edits")?.inputSchema);
    for (const key of EDIT_KEYS) expect(schema).toContain(`"${key}"`);
  });

  it("describes the document with the open view", async () => {
    const { call } = await connect(fakeDeps().deps);
    const text = textOf(await call("document"));
    expect(text).toContain('page 0:1 "Screens"');
    expect(text).toContain('1:2 "Home" 1440×900');
    expect(text).toContain("selection: 5:1/1:3");
  });

  it("outlines by address and refuses unknown nodes", async () => {
    const { deps, doc } = fakeDeps();
    const { call } = await connect(deps);
    expect(textOf(await call("outline", { address: "1:2", limit: 10 }))).toContain('"Home"');
    expect(doc.outline).toHaveBeenCalledWith(["1:2"], 10);
    const missing = await call("outline", { address: "9:9" });
    expect(missing.isError).toBe(true);
    expect(textOf(missing)).toBe("no node at this address");
  });

  it("inspects a node with the editable values", async () => {
    const { call } = await connect(fakeDeps().deps);
    expect(json(textOf(await call("inspect", { address: "5:1/1:3" })))).toMatchObject({
      address: "5:1/1:3",
      path: "Screens / Home / Card / Title",
      css: { Typography: "font-size: 16px; color: #111111;" },
      editable: { fontSize: "16px" },
    });
  });

  it("refuses an invalid address", async () => {
    const { call } = await connect(fakeDeps().deps);
    const result = await call("inspect", { address: "5:1//" });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("invalid address");
    expect(textOf(await call("inspect", { address: "x".repeat(65) }))).toBe("invalid address");
  });

  it("searches names through the agent matcher", async () => {
    const { deps, doc } = fakeDeps();
    const { call } = await connect(deps);
    expect(json(textOf(await call("search", { query: "title" })))).toEqual([
      { address: "5:1/1:3", kind: "text", path: "Screens / Home / Card / Title", hidden: false, screen: "1:2", page: "0:1" },
    ]);
    expect(doc.search).toHaveBeenCalledWith("title", true);
  });

  it("reports the selection", async () => {
    const { call } = await connect(fakeDeps().deps);
    expect(json(textOf(await call("selection")))).toEqual({ page: "0:1", screen: "1:2", selection: "5:1/1:3" });
  });

  it("shoots a whole screen by its id and a node by its address", async () => {
    const { deps, shot } = fakeDeps();
    const { call } = await connect(deps);
    const screen = await call("screenshot", { address: "1:2" });
    expect(screen.content[0]).toMatchObject({ type: "image", mimeType: "image/png", data: "iVBORw==" });
    expect(textOf({ content: screen.content.slice(1) })).toBe("40×20 px");
    expect(shot).toHaveBeenCalledWith({ screenId: "1:2" });
    await call("screenshot", { address: "5:1/1:3" });
    expect(shot).toHaveBeenLastCalledWith({ screenId: "1:2", address: ["5:1", "1:3"] });
  });

  it("applies a batch as css strings and answers with the step and changed nodes", async () => {
    const { deps, batch } = fakeDeps();
    const { call } = await connect(deps);
    const result = await call("apply_edits", { edits: [{ target: "5:1/1:3", style: { color: "#ff6600" } }, { target: "1:4", text: "Hi" }] });
    expect(result.isError).toBeUndefined();
    expect(json(textOf(result))).toEqual({ step: 4, changed: ["5:1/1:3", "1:4"], screens: ["1:2"] });
    expect(batch).toHaveBeenCalledWith(
      [
        { target: ["5:1", "1:3"], style: { color: { r: 255, g: 102, b: 0, a: 1 } } },
        { target: ["1:4"], text: "Hi" },
      ],
      false,
    );
  });

  it("rejects a whole batch on the first invalid edit with its index", async () => {
    const { deps, batch } = fakeDeps();
    const { call } = await connect(deps);
    const result = await call("apply_edits", { edits: [{ target: "1:4", text: "Hi" }, { target: "1:5", style: { zIndex: "2" } }] });
    expect(result.isError).toBe(true);
    expect(json(textOf(result))).toEqual({ index: 1, reason: '"zIndex" is not an editable style key' });
    expect(batch).not.toHaveBeenCalled();
  });

  it("refuses hidden until it is editable", async () => {
    const { call } = await connect(fakeDeps().deps);
    const result = await call("apply_edits", { edits: [{ target: "1:4", hidden: true }] });
    expect(json(textOf(result))).toEqual({ index: 0, reason: '"hidden" is not editable yet' });
  });

  it("passes the main component guard through", async () => {
    const { deps, batch } = fakeDeps();
    batch.mockResolvedValueOnce({ index: 0, reason: "the node is inside a main component with 3 instances; set affectsInstances" });
    const { call } = await connect(deps);
    const refused = await call("apply_edits", { edits: [{ target: "1:4", text: "Hi" }] });
    expect(refused.isError).toBe(true);
    expect(json(textOf(refused))).toMatchObject({ index: 0 });
    await call("apply_edits", { edits: [{ target: "1:4", text: "Hi" }], affectsInstances: true });
    expect(batch).toHaveBeenLastCalledWith([{ target: ["1:4"], text: "Hi" }], true);
  });

  it("undoes the agent batch and reports the importer refusal", async () => {
    const { deps, undoAgent } = fakeDeps();
    const { call } = await connect(deps);
    expect(json(textOf(await call("undo_agent_edit")))).toEqual({ changed: ["5:1/1:3"], screens: ["1:2"] });
    undoAgent.mockRejectedValueOnce(new Error("the top of the history is a user edit"));
    const refused = await call("undo_agent_edit");
    expect(refused.isError).toBe(true);
    expect(textOf(refused)).toBe("the top of the history is a user edit");
  });

  it("opens a screen and selects a node in the app", async () => {
    const { deps, focused } = fakeDeps();
    const { call } = await connect(deps);
    expect(textOf(await call("open_screen", { screenId: "1:2" }))).toBe("opened");
    expect((await call("open_screen", { screenId: "7:7" })).isError).toBe(true);
    expect(textOf(await call("select", { address: "5:1/1:3" }))).toBe("selected");
    expect(focused).toEqual([{ place: { pageId: "0:1", screenId: "1:2" } }, { place: { pageId: "0:1", screenId: "1:2" }, target: ["5:1", "1:3"] }]);
  });

  it("answers every document tool while importing or without a document", async () => {
    const importing: AgentDeps = { ...fakeDeps().deps, doc: documentGate(new Promise(() => undefined)) };
    const rejected = Promise.reject(new Error("broken"));
    const failed: AgentDeps = { ...fakeDeps().deps, doc: documentGate(rejected) };
    await rejected.catch(() => undefined);
    const busy = await connect(importing);
    const none = await connect(failed);
    expect(textOf(await busy.call("outline", { address: "1:2" }))).toBe("the document is still importing, retry later");
    expect(textOf(await none.call("apply_edits", { edits: [{ target: "1:4", text: "Hi" }] }))).toBe("no document is open");
  });

  it("logs each call without the edit values", async () => {
    const tool = vi.fn();
    const { call } = await connect(fakeDeps().deps, { tool, event: () => undefined });
    await call("apply_edits", { edits: [{ target: "5:1/1:3", text: "secret" }] });
    expect(tool).toHaveBeenCalledWith(expect.objectContaining({ tool: "apply_edits", addresses: ["5:1/1:3"], ok: true }));
    expect(JSON.stringify(tool.mock.calls)).not.toContain("secret");
  });
});
