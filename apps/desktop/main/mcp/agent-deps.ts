import type { AgentFocus, AgentView } from "../../shared/api";
import type { DocumentEditor } from "../document-editor";
import type { LoadedDocument } from "../load-document";
import type { Thumbnails } from "../thumbnails";

export type AgentDocument = Pick<LoadedDocument, "pages" | "search" | "outline" | "inspect">;

export type AgentDeps = {
  doc: () => Promise<AgentDocument>;
  editor: Pick<DocumentEditor, "batch" | "undoAgent">;
  shot: Thumbnails["shot"];
  view: () => AgentView;
  focus: (focus: AgentFocus) => void;
};
