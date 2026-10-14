import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AgentDeps } from "./agent-deps";
import type { ToolRun } from "./tool-run";
import { registerApplyEdits } from "./tools/apply-edits";
import { registerDocument } from "./tools/document";
import { registerInspect } from "./tools/inspect";
import { registerOpenScreen } from "./tools/open-screen";
import { registerOutline } from "./tools/outline";
import { registerScreenshot } from "./tools/screenshot";
import { registerSearch } from "./tools/search";
import { registerSelect } from "./tools/select";
import { registerSelection } from "./tools/selection";
import type { RegisterTool } from "./tools/tool";
import { registerUndoAgentEdit } from "./tools/undo-agent-edit";

const TOOLS: readonly RegisterTool[] = [
  registerDocument,
  registerOutline,
  registerInspect,
  registerSearch,
  registerSelection,
  registerScreenshot,
  registerApplyEdits,
  registerUndoAgentEdit,
  registerOpenScreen,
  registerSelect,
];

const INSTRUCTIONS = [
  "fignya is a desktop design tool whose designs are live HTML/CSS imported from Figma.",
  "Read with document → outline (expand instances by their address) → inspect/screenshot; edit with apply_edits",
  "using CSS values; check the result with screenshot; undo_agent_edit reverts your last batch.",
  "Nodes are addressed by ids joined with '/' from the outermost instance, exactly as outline and search print them.",
].join(" ");

export const createMcpServer = (deps: AgentDeps, run: ToolRun, version: string): McpServer => {
  const server = new McpServer({ name: "fignya", version }, { instructions: INSTRUCTIONS });
  for (const register of TOOLS) register(server, deps, run);
  return server;
};
