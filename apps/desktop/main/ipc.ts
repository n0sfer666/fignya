import { ipcMain, type IpcMainInvokeEvent } from "electron";
import type { ScreenModel, SearchHit } from "@fignya/model";
import { errorMessage } from "../shared/error-message";
import { DOCUMENT_CHANNEL, SCREEN_CHANNEL, SEARCH_CHANNEL, type DocumentState } from "../shared/api";
import type { LoadedDocument } from "./load-document";
import { isAppUrl } from "./windows";

const MAX_QUERY_LENGTH = 2048;

export const assertApp = (event: IpcMainInvokeEvent): void => {
  if (!isAppUrl(event.senderFrame?.url ?? "")) throw new Error("fignya: untrusted IPC sender");
};

export const registerDocumentIpc = (loaded: Promise<LoadedDocument>): void => {
  ipcMain.handle(DOCUMENT_CHANNEL, (event): Promise<DocumentState> => {
    assertApp(event);
    return loaded.then(
      (doc) => ({ status: "ready", pages: doc.pages }),
      (error: unknown) => ({ status: "error", message: errorMessage(error) }),
    );
  });
  ipcMain.handle(SCREEN_CHANNEL, async (event, id: unknown): Promise<ScreenModel | undefined> => {
    assertApp(event);
    const doc = await loaded;
    return typeof id === "string" ? doc.screen(id) : undefined;
  });
  ipcMain.handle(SEARCH_CHANNEL, async (event, query: unknown): Promise<SearchHit[]> => {
    assertApp(event);
    const doc = await loaded;
    return typeof query === "string" && query.length <= MAX_QUERY_LENGTH ? doc.search(query) : [];
  });
};
