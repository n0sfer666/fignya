import { utilityProcess } from "electron";
import { join } from "node:path";
import type { FontUsage, ImportProgress } from "@fignya/fig-import";
import type { BatchRejection, Edit, EditChange, HistoryTop, NodeId, Page, ScreenModel, SearchHit } from "@fignya/model";
import type { ImporterEvent, ImporterRequest, NodeDetails, Restored } from "../importer/protocol";
import { isImporterEvent } from "../importer/protocol-guards";
import { pendingRequests } from "./pending-requests";

export type ImportEvents = { progress: (progress: ImportProgress) => void; lost: (message: string) => void };

export type Edited = { changes: EditChange[]; top?: HistoryTop; dirty: boolean };

export type EditReply = Edited | BatchRejection;

export type OpenedDocument = { pages: Page[]; restored: Restored };

export type ImportClient = {
  opened: Promise<OpenedDocument>;
  fonts: Promise<FontUsage[]>;
  screen: (id: string) => Promise<ScreenModel | undefined>;
  image: (id: string) => Promise<Uint8Array | undefined>;
  search: (query: string, names?: boolean) => Promise<SearchHit[]>;
  outline: (address: NodeId[], limit: number) => Promise<string | undefined>;
  inspect: (address: NodeId[]) => Promise<NodeDetails | undefined>;
  edit: (edit: Edit) => Promise<Edited>;
  batch: (edits: Edit[], affectsInstances: boolean) => Promise<EditReply>;
  undo: () => Promise<Edited>;
  undoAgent: () => Promise<Edited>;
  redo: () => Promise<Edited>;
  save: () => Promise<boolean>;
};

const edited = (reply: EditReply): Edited => {
  if ("index" in reply) throw new Error(reply.reason);
  return reply;
};

export const startImport = (path: string, events: ImportEvents): ImportClient => {
  const child = utilityProcess.fork(join(__dirname, "importer.js"), [], { serviceName: "fignya importer" });
  const screens = pendingRequests<ScreenModel | undefined>();
  const images = pendingRequests<Uint8Array | undefined>();
  const searches = pendingRequests<SearchHit[]>();
  const outlines = pendingRequests<string | undefined>();
  const details = pendingRequests<NodeDetails | undefined>();
  const edits = pendingRequests<EditReply>();
  const saves = pendingRequests<boolean>();
  const byRequest = { screen: screens, image: images, search: searches, outline: outlines, inspect: details, edit: edits, batch: edits, undo: edits, redo: edits, save: saves };
  const send = (request: ImporterRequest): void => child.postMessage(request);
  let ready = false;
  let gotFonts: (fonts: FontUsage[]) => void = () => undefined;
  let lostFonts: (error: Error) => void = () => undefined;
  const fonts = new Promise<FontUsage[]>((resolve, reject) => {
    gotFonts = resolve;
    lostFonts = reject;
  });
  fonts.catch(() => undefined);
  const opened = new Promise<OpenedDocument>((resolve, reject) => {
    const dispatch = (event: ImporterEvent): void => {
      if (event.type === "progress") events.progress(event.progress);
      else if (event.type === "ready") {
        ready = true;
        resolve({ pages: event.pages, restored: event.restored });
      } else if (event.type === "failed") {
        reject(new Error(event.message));
        child.kill();
      } else if (event.type === "fonts") gotFonts(event.fonts);
      else if (event.type === "screen") screens.settle(event.reqId, event.model);
      else if (event.type === "image") images.settle(event.reqId, event.bytes);
      else if (event.type === "found") searches.settle(event.reqId, event.hits);
      else if (event.type === "outlined") outlines.settle(event.reqId, event.text);
      else if (event.type === "inspected") details.settle(event.reqId, event.details);
      else if (event.type === "edited") edits.settle(event.reqId, { changes: event.changes, ...(event.top ? { top: event.top } : {}), dirty: event.dirty });
      else if (event.type === "rejected") edits.settle(event.reqId, { index: event.index, reason: event.reason });
      else if (event.type === "saved") saves.settle(event.reqId, event.dirty);
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
      for (const pending of [screens, images, searches, outlines, details, edits, saves]) pending.fail(error);
      if (ready) events.lost(error.message);
    });
  });
  send({ type: "load", path });
  return {
    opened,
    fonts,
    screen: (id) => screens.ask((reqId) => send({ type: "screen", reqId, id })),
    image: (id) => images.ask((reqId) => send({ type: "image", reqId, id })),
    search: (query, names) => searches.ask((reqId) => send({ type: "search", reqId, query, ...(names ? { names } : {}) })),
    outline: (address, limit) => outlines.ask((reqId) => send({ type: "outline", reqId, address, limit })),
    inspect: (address) => details.ask((reqId) => send({ type: "inspect", reqId, address })),
    edit: (edit) => edits.ask((reqId) => send({ type: "edit", reqId, edit })).then(edited),
    batch: (batch, affectsInstances) => edits.ask((reqId) => send({ type: "batch", reqId, edits: batch, origin: "agent", affectsInstances })),
    undo: () => edits.ask((reqId) => send({ type: "undo", reqId })).then(edited),
    undoAgent: () => edits.ask((reqId) => send({ type: "undo", reqId, origin: "agent" })).then(edited),
    redo: () => edits.ask((reqId) => send({ type: "redo", reqId })).then(edited),
    save: () => saves.ask((reqId) => send({ type: "save", reqId })),
  };
};
