import type { FigImport } from "@fignya/fig-import";
import { createEditHistory, locateNode, screenModel, searchDocument, type EditChange, type EditHistory, type NodeId } from "@fignya/model";
import { errorMessage } from "../shared/error-message";
import type { EditQuery, ImporterEvent, ImporterRequest, Query } from "./protocol";

export type ImporterHandler = (request: ImporterRequest) => Promise<void>;

export type ImporterDeps = {
  send: (event: ImporterEvent) => void;
  load: (path: string) => Promise<FigImport>;
  settle: (doc: FigImport) => void;
};

const changeOf = (doc: FigImport, target: NodeId[] | undefined): EditChange | undefined => {
  const screenId = target && locateNode(doc.document, target)?.place?.screenId;
  return target && screenId !== undefined ? { screenId, target } : undefined;
};

const edited = (history: EditHistory, query: EditQuery): NodeId[] | undefined => {
  if (query.type === "undo") return history.undo();
  if (query.type === "redo") return history.redo();
  const target = history.apply(query.edit);
  if (!target) throw new Error("invalid edit");
  return target;
};

export const createImporterHandler = ({ send, load, settle }: ImporterDeps): ImporterHandler => {
  let loading: Promise<FigImport> | undefined;
  let history: EditHistory | undefined;

  const reply = (doc: FigImport, query: Query): ImporterEvent => {
    if (query.type === "edit" || query.type === "undo" || query.type === "redo") {
      history ??= createEditHistory(doc.document.nodes);
      return { type: "edited", reqId: query.reqId, change: changeOf(doc, edited(history, query)) };
    }
    if (query.type === "search") return { type: "found", reqId: query.reqId, hits: searchDocument(doc.document, query.query) };
    if (query.type === "screen") return { type: "screen", reqId: query.reqId, model: screenModel(doc.document.nodes, query.id) };
    return { type: "image", reqId: query.reqId, bytes: doc.images.get(query.id) };
  };

  const answer = async (query: Query): Promise<void> => {
    try {
      if (!loading) throw new Error("document is not loaded");
      send(reply(await loading, query));
    } catch (error) {
      send({ type: "refused", request: query.type, reqId: query.reqId, message: errorMessage(error) });
    }
  };

  return async (request) => {
    if (request.type !== "load") return answer(request);
    if (loading) return;
    loading = load(request.path);
    loading
      .then(
        (doc) => {
          try {
            send({ type: "ready", pages: doc.document.pages });
          } finally {
            settle(doc);
          }
        },
        (error: unknown) => send({ type: "failed", message: errorMessage(error) }),
      )
      .catch((error: unknown) => console.error(`fignya: importer: load: ${errorMessage(error)}`));
  };
};
