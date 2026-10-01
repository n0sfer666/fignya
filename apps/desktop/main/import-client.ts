import { utilityProcess } from "electron";
import { join } from "node:path";
import type { FontUsage, ImportProgress } from "@fignya/fig-import";
import type { Page, ScreenModel } from "@fignya/model";
import type { ImporterEvent, ImporterRequest } from "../importer/protocol";
import { isImporterEvent } from "../importer/protocol-guards";
import { pendingRequests } from "./pending-requests";

export type ImportEvents = { progress: (progress: ImportProgress) => void; lost: (message: string) => void };

export type ImportClient = {
  pages: Promise<Page[]>;
  fonts: Promise<FontUsage[]>;
  screen: (id: string) => Promise<ScreenModel | undefined>;
  image: (id: string) => Promise<Uint8Array | undefined>;
};

export const startImport = (path: string, events: ImportEvents): ImportClient => {
  const child = utilityProcess.fork(join(__dirname, "importer.js"), [], { serviceName: "fignya importer" });
  const screens = pendingRequests<ScreenModel | undefined>();
  const images = pendingRequests<Uint8Array | undefined>();
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
      else (event.request === "screen" ? screens : images).reject(event.reqId, new Error(event.message));
    };
    child.on("message", (message: unknown) => {
      if (isImporterEvent(message)) dispatch(message);
      else console.error("fignya: unknown importer message");
    });
    child.once("exit", (code) => {
      const error = new Error(`importer exited with code ${code}`);
      reject(error);
      lostFonts(error);
      screens.fail(error);
      images.fail(error);
      if (ready) events.lost(error.message);
    });
  });
  send({ type: "load", path });
  return {
    pages,
    fonts,
    screen: (id) => screens.ask((reqId) => send({ type: "screen", reqId, id })),
    image: (id) => images.ask((reqId) => send({ type: "image", reqId, id })),
  };
};
