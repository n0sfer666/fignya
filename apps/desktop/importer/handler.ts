import type { FigImport } from "@fignya/fig-import";
import { screenModel } from "@fignya/model";
import { errorMessage } from "../shared/error-message";
import type { AssetQuery, ImporterEvent, ImporterRequest } from "./protocol";

export type ImporterHandler = (request: ImporterRequest) => Promise<void>;

export const createImporterHandler = (send: (event: ImporterEvent) => void, load: (path: string) => Promise<FigImport>): ImporterHandler => {
  let loading: Promise<FigImport> | undefined;

  const answer = async (query: AssetQuery): Promise<void> => {
    try {
      if (!loading) throw new Error("document is not loaded");
      const doc = await loading;
      if (query.type === "screen") send({ type: "screen", reqId: query.reqId, model: screenModel(doc.document.nodes, query.id) });
      else send({ type: "image", reqId: query.reqId, bytes: doc.images.get(query.id) });
    } catch (error) {
      send({ type: "refused", request: query.type, reqId: query.reqId, message: errorMessage(error) });
    }
  };

  return async (request) => {
    if (request.type !== "load") return answer(request);
    if (loading) return;
    loading = load(request.path);
    loading.then(
      (doc) => send({ type: "ready", pages: doc.document.pages }),
      (error: unknown) => send({ type: "failed", message: errorMessage(error) }),
    );
  };
};
