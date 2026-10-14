import { readFile } from "node:fs/promises";
import { documentFonts, importSteps, readArchive, settleOverrides, type FigImport, type ImportProgress } from "@fignya/fig-import";
import { errorMessage } from "../shared/error-message";
import { fingerprint } from "./fingerprint";
import { createImporterHandler, type LoadedFig } from "./handler";
import { IMPORT_PACE, paced } from "./paced";
import type { ImporterEvent } from "./protocol";
import { isImporterRequest, refusalOf } from "./protocol-guards";
import type { BaseFingerprint } from "./sidecar-format";
import { sidecarStore } from "./sidecar-store";

const port = process.parentPort;

const send = (event: ImporterEvent): void => port.postMessage(event);

const readBytes = async (path: string): Promise<Uint8Array> => {
  const data = await readFile(path);
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
};

type ReadFig = { steps: Generator<ImportProgress, FigImport>; base: BaseFingerprint };

const readFig = async (path: string): Promise<ReadFig> => {
  const bytes = await readBytes(path);
  return { steps: importSteps(readArchive(bytes)), base: fingerprint(bytes) };
};

const load = async (path: string): Promise<LoadedFig> => {
  const started = performance.now();
  const { steps, base } = await readFig(path);
  const imported = await paced(steps, IMPORT_PACE, (progress) => send({ type: "progress", progress }));
  const screens = imported.document.pages.reduce((sum, p) => sum + p.screens.length, 0);
  console.log(`fignya: imported ${imported.document.pages.length} pages, ${screens} screens in ${Math.round(performance.now() - started)} ms`);
  return { doc: imported, base };
};

const settle = ({ document }: FigImport): void => {
  const started = performance.now();
  paced(settleOverrides(document), IMPORT_PACE, () => undefined)
    .then(
      ({ overrides, failed }) =>
        console.log(`fignya: settled ${overrides} overrides (${failed} instances failed) in ${Math.round(performance.now() - started)} ms`),
      (error: unknown) => console.error(`fignya: importer: settle: ${errorMessage(error)}`),
    )
    .then(() => send({ type: "fonts", fonts: documentFonts(document.nodes) }))
    .catch((error: unknown) => {
      console.error(`fignya: importer: fonts: ${errorMessage(error)}`);
      send({ type: "fonts", fonts: [] });
    });
};

const handle = createImporterHandler({ send, load, store: sidecarStore, settle });

const refuse = (data: unknown): void => {
  const refusal = refusalOf(data);
  if (refusal) send(refusal);
  console.error("fignya: importer: unknown request");
};

port.on("message", ({ data }: { data: unknown }) => {
  if (!isImporterRequest(data)) return refuse(data);
  handle(data).catch((error: unknown) => console.error(`fignya: importer: ${errorMessage(error)}`));
});
