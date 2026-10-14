import type { EditableDocument } from "@fignya/model";
import type { Rec } from "./fig/guards";
import { slimNode } from "./fig/kept-fields";
import type { FigArchive } from "./fig/read-archive";
import { readMessage } from "./fig/read-message";
import { convertSteps } from "./import-document";
import { PROGRESS_EVERY, type ImportProgress } from "./import-progress";
import { takeOnce } from "./take-once";
import { blobsOf } from "./tree/node-index";
import { preparedNodes } from "./tree/prepared-nodes";

export type FigImport = { document: EditableDocument; images: ReadonlyMap<string, Uint8Array> };

type Decoded = { nodes: Rec[]; blobs: Uint8Array[] };

function* decodeSteps(canvas: () => Uint8Array): Generator<ImportProgress, Decoded> {
  const reader = readMessage(canvas());
  const nodes: Rec[] = [];
  let step = reader.next();
  while (!step.done) {
    const { node, index, total } = step.value;
    if (index % PROGRESS_EVERY === 0) yield { phase: "decode", done: index, total };
    nodes.push(slimNode(node));
    step = reader.next();
  }
  return { nodes, blobs: blobsOf(step.value) };
}

function* finishSteps(decoding: Generator<ImportProgress, Decoded>, images: FigImport["images"]): Generator<ImportProgress, FigImport> {
  const { nodes, blobs } = yield* decoding;
  const document = yield* convertSteps(preparedNodes(nodes), blobs);
  return { document, images };
}

export const importSteps = ({ canvas, images }: FigArchive): Generator<ImportProgress, FigImport> => finishSteps(decodeSteps(takeOnce(canvas)), images);
