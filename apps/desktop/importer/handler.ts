import type { FigImport } from "@fignya/fig-import";
import { locateNode, screenModel, searchDocument, searchNames, type EditChange, type NodeId } from "@fignya/model";
import { errorMessage } from "../shared/error-message";
import { preparedBatch, readReply } from "./agent-replies";
import { openEditSession, type EditSession } from "./edit-session";
import type { EditQuery, ImporterEvent, ImporterRequest, Query } from "./protocol";
import type { BaseFingerprint } from "./sidecar-format";
import type { SidecarStore } from "./sidecar-store";

export type ImporterHandler = (request: ImporterRequest) => Promise<void>;

export type LoadedFig = { doc: FigImport; base: BaseFingerprint };

export type ImporterDeps = {
  send: (event: ImporterEvent) => void;
  load: (path: string) => Promise<LoadedFig>;
  store: (path: string) => SidecarStore;
  settle: (doc: FigImport) => void;
};

type Opened = { doc: FigImport; session: EditSession };

const changesOf = (doc: FigImport, targets: NodeId[][] | undefined): EditChange[] =>
  (targets ?? []).flatMap((target) => {
    const screenId = locateNode(doc.document, target)?.place?.screenId;
    return screenId === undefined ? [] : [{ screenId, target }];
  });

const edited = ({ doc, session }: Opened, query: EditQuery): ImporterEvent => {
  const ready = query.type === "batch" ? preparedBatch(doc, query) : query;
  if (ready.type === "rejected") return ready;
  const stepped = session.step(ready);
  if (stepped && !Array.isArray(stepped)) return { type: "rejected", reqId: query.reqId, index: stepped.index, reason: stepped.reason };
  const changes = changesOf(doc, stepped);
  const top = session.top();
  return { type: "edited", reqId: query.reqId, changes, ...(top ? { top } : {}), dirty: session.dirty() };
};

const reply = async (opened: Opened, query: Query): Promise<ImporterEvent> => {
  const { doc, session } = opened;
  if (query.type === "edit" || query.type === "batch" || query.type === "undo" || query.type === "redo") return edited(opened, query);
  if (query.type === "outline" || query.type === "inspect") return readReply(doc, query);
  if (query.type === "save") return { type: "saved", reqId: query.reqId, dirty: await session.save() };
  if (query.type === "search") return { type: "found", reqId: query.reqId, hits: (query.names ? searchNames : searchDocument)(doc.document, query.query) };
  if (query.type === "screen") return { type: "screen", reqId: query.reqId, model: screenModel(doc.document.nodes, query.id) };
  return { type: "image", reqId: query.reqId, bytes: doc.images.get(query.id) };
};

export const createImporterHandler = ({ send, load, store, settle }: ImporterDeps): ImporterHandler => {
  let loading: Promise<Opened> | undefined;

  const open = async (path: string): Promise<Opened> => {
    const { doc, base } = await load(path);
    return { doc, session: await openEditSession(doc.document.nodes, base, store(path)) };
  };

  const answer = async (query: Query): Promise<void> => {
    try {
      if (!loading) throw new Error("document is not loaded");
      send(await reply(await loading, query));
    } catch (error) {
      send({ type: "refused", request: query.type, reqId: query.reqId, message: errorMessage(error) });
    }
  };

  return async (request) => {
    if (request.type !== "load") return answer(request);
    if (loading) return;
    loading = open(request.path);
    loading
      .then(
        ({ doc, session }) => {
          try {
            send({ type: "ready", pages: doc.document.pages, restored: session.restored });
          } finally {
            settle(doc);
          }
        },
        (error: unknown) => send({ type: "failed", message: errorMessage(error) }),
      )
      .catch((error: unknown) => console.error(`fignya: importer: load: ${errorMessage(error)}`));
  };
};
