import { utilityProcess } from "electron";
import { join } from "node:path";
import type { FontUsage, ImportProgress } from "@fignya/fig-import";
import type { Edit, EditChange, Page, ScreenModel, SearchHit } from "@fignya/model";
import type { ImporterEvent, ImporterRequest } from "../importer/protocol";
import { isImporterEvent } from "../importer/protocol-guards";
import { pendingRequests } from "./pending-requests";

export type ImportEvents = { progress: (progress: ImportProgress) => void; lost: (message: string) => void };

export type ImportClient = {
  pages: Promise<Page[]>;
  fonts: Promise<FontUsage[]>;
  screen: (id: string) => Promise<ScreenModel | undefined>;
  image: (id: string) => Promise<Uint8Array | undefined>;
  search: (query: string) => Promise<SearchHit[]>;
  edit: (edit: Edit) => Promise<EditChange | undefined>;
  undo: () => Promise<EditChange | undefined>;
  redo: () => Promise<EditChange | undefined>;
};

export const startImport = (path: string, events: ImportEvents): ImportClient => {
  const child = utilityProcess.fork(join(__dirname, "importer.js"), [], { serviceName: "fignya importer" });
  const screens = pendingRequests<ScreenModel | undefined>();
  const images = pendingRequests<Uint8Array | undefined>();
  const searches = pendingRequests<SearchHit[]>();
  const edits = pendingRequests<EditChange | undefined>();
  const byRequest = { screen: screens, image: images, search: searches, edit: edits, undo: edits, redo: edits };
  const send = (request: ImporterRequest): void => child.postMessage(request);
  let ready = false;
  let gotFonts: (fonts: FontUsage[]) => void = () => undefined;
  let lostFonts: (error: Error) => void = () => undefined;
  const fonts = new Promise<FontUsage[]>((resolve, reject) => {
    gotFonts = resolve;
    lostFonts = reject;
  });
  fonts.catch(() => undefined);
  const pages = new Promise<Page[]>((resolve, reject) => {
    const dispatch = (event: ImporterEvent): void => {
      if (event.type === "progress") events.progress(event.progress);
      else if (event.type === "ready") {
        ready = true;
        resolve(event.pages);
      } else if (event.type === "failed") {
        reject(new Error(event.message));
        child.kill();
      } else if (event.type === "fonts") gotFonts(event.fonts);
      else if (event.type === "screen") screens.settle(event.reqId, event.model);
      else if (event.type === "image") images.settle(event.reqId, event.bytes);
      else if (event.type === "found") searches.settle(event.reqId, event.hits);
      else if (event.type === "edited") edits.settle(event.reqId, event.change);
      else byRequest[event.request].reject(event.reqId, new Error(event.message));
    };
    child.on("message", (message: unknown) => {
      if (isImporterEvent(message)) dispatch(message);
      else console.error("fignya: unknown importer message");
    });
    child.once("exit", (code) => {
      const error = new Error(`importer exited with code ${code}`);
      reject(error);
      lostFonts(error);
      for (const pending of [screens, images, searches, edits]) pending.fail(error);
      if (ready) events.lost(error.message);
    });
  });
  send({ type: "load", path });
  return {
    pages,
    fonts,
    screen: (id) => screens.ask((reqId) => send({ type: "screen", reqId, id })),
    image: (id) => images.ask((reqId) => send({ type: "image", reqId, id })),
    search: (query) => searches.ask((reqId) => send({ type: "search", reqId, query })),
    edit: (edit) => edits.ask((reqId) => send({ type: "edit", reqId, edit })),
    undo: () => edits.ask((reqId) => send({ type: "undo", reqId })),
    redo: () => edits.ask((reqId) => send({ type: "redo", reqId })),
  };
};
