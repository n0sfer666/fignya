import { readFile } from "node:fs/promises";
import { importSteps, readArchive, type FigImport } from "@fignya/fig-import";
import { errorMessage } from "../shared/error-message";
import { createImporterHandler } from "./handler";
import { IMPORT_PACE, paced } from "./paced";
import type { ImporterEvent } from "./protocol";
import { isImporterRequest } from "./protocol-guards";

const port = process.parentPort;

const send = (event: ImporterEvent): void => port.postMessage(event);

const readBytes = async (path: string): Promise<Uint8Array> => {
  const data = await readFile(path);
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
};

const load = async (path: string): Promise<FigImport> => {
  const started = performance.now();
  const imported = await paced(importSteps(readArchive(await readBytes(path))), IMPORT_PACE, (progress) => send({ type: "progress", progress }));
  const screens = imported.document.pages.reduce((sum, p) => sum + p.screens.length, 0);
  console.log(`fignya: imported ${imported.document.pages.length} pages, ${screens} screens in ${Math.round(performance.now() - started)} ms`);
  return imported;
};

const handle = createImporterHandler(send, load);

port.on("message", ({ data }: { data: unknown }) => {
  if (!isImporterRequest(data)) return console.error("fignya: importer: unknown request");
  handle(data).catch((error: unknown) => console.error(`fignya: importer: ${errorMessage(error)}`));
});
