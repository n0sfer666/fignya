import { vi } from "vitest";
import type { Edit, HistoryTop, Page } from "@fignya/model";
import type { AgentDeps, AgentDocument } from "../../main/mcp/agent-deps";
import type { Edited, EditReply } from "../../main/import-client";
import type { NodeDetails } from "../../importer/protocol";
import type { AgentFocus, AgentView } from "../../shared/api";

export const pages: Page[] = [{ id: "0:1", name: "Screens", screens: [{ id: "1:2", name: "Home", x: 0, y: 0, width: 1440, height: 900 }] }];

export const titleDetails: NodeDetails = {
  hit: { match: "id", target: ["5:1", "1:3"], kind: "text", trail: ["Screens", "Home", "Card", "Title"], hidden: false, place: { pageId: "0:1", screenId: "1:2" } },
  inspection: { layer: [["width", "120px"]], sections: [{ title: "Typography", rows: [["font-size", "16px"], ["color", "#111111"]] }] },
  values: { fontSize: "16px", color: "#111111" },
};

const agentTop: HistoryTop = { step: 4, origin: "agent" };

export const fakeDeps = () => {
  const view: AgentView = { pageId: "0:1", screenId: "1:2", target: ["5:1", "1:3"] };
  const focused: AgentFocus[] = [];
  const doc: AgentDocument = {
    pages,
    search: vi.fn(async () => [titleDetails.hit]),
    outline: vi.fn(async (address: string[]) => (address[0] === "1:2" ? '1:2 "Home" frame 0,0 1440×900' : undefined)),
    inspect: vi.fn(async (address: string[]) => (address.join("/") === "5:1/1:3" ? titleDetails : undefined)),
  };
  const batch = vi.fn(
    async (edits: Edit[], _affectsInstances: boolean): Promise<EditReply> => ({ changes: edits.map((edit) => ({ screenId: "1:2", target: edit.target })), top: agentTop, dirty: true }),
  );
  const undoAgent = vi.fn(async (): Promise<Edited> => ({ changes: [{ screenId: "1:2", target: ["5:1", "1:3"] }], dirty: false }));
  const shot = vi.fn(async () => ({ png: new Uint8Array([137, 80, 78, 71]), width: 40, height: 20 }));
  const deps: AgentDeps = {
    doc: async () => doc,
    editor: { batch, undoAgent },
    shot,
    view: () => view,
    focus: (focus) => focused.push(focus),
  };
  return { deps, doc, batch, undoAgent, shot, focused };
};
