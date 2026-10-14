import { createHash } from "node:crypto";
import { createEditHistory, restoreEdits, type DesignNode, type Edit, type EditHistory, type NodeId } from "@fignya/model";
import { errorMessage } from "../shared/error-message";
import type { EditQuery, Restored } from "./protocol";
import { parseSidecar, sameBase, serializeSidecar, type BaseFingerprint } from "./sidecar-format";
import type { SidecarStore } from "./sidecar-store";

export type EditSession = {
  restored: Restored;
  step: (query: EditQuery) => NodeId[] | undefined;
  dirty: () => boolean;
  save: () => Promise<boolean>;
};

type Saved = { edits: Edit[]; stale: boolean };

const savedEdits = async (store: SidecarStore, base: BaseFingerprint): Promise<Saved> => {
  const text = await store.read().catch((error: unknown) => {
    console.error(`fignya: importer: sidecar: ${errorMessage(error)}`);
    return "";
  });
  if (text === undefined) return { edits: [], stale: false };
  const sidecar = parseSidecar(text);
  return sidecar && sameBase(sidecar.base, base) ? { edits: sidecar.edits, stale: false } : { edits: [], stale: true };
};

const keyOf = (edits: Edit[]): string => JSON.stringify(edits);

const restoredKey = (edits: Edit[]): string => (edits.length === 0 ? "" : createHash("sha1").update(keyOf(edits)).digest("hex").slice(0, 16));

const stepped = (history: EditHistory, query: EditQuery): NodeId[] | undefined => {
  if (query.type === "undo") return history.undo();
  if (query.type === "redo") return history.redo();
  const target = history.apply(query.edit);
  if (!target) throw new Error("invalid edit");
  return target;
};

export const openEditSession = async (nodes: Map<NodeId, DesignNode>, base: BaseFingerprint, store: SidecarStore): Promise<EditSession> => {
  const { edits, stale } = await savedEdits(store, base);
  const { applied, skipped } = restoreEdits(nodes, edits);
  const history = createEditHistory(nodes, applied);
  let savedKey = keyOf(history.edits());
  let backedUp = !stale && skipped === 0;
  let writing: Promise<unknown> = Promise.resolve();
  const dirty = (): boolean => keyOf(history.edits()) !== savedKey;
  const write = async (snapshot: Edit[]): Promise<boolean> => {
    if (!backedUp) {
      await store.backup();
      backedUp = true;
    }
    await store.write(serializeSidecar({ base, edits: snapshot }));
    savedKey = keyOf(snapshot);
    return dirty();
  };
  return {
    restored: { edits: applied.length, skipped, stale, key: restoredKey(history.edits()) },
    step: (query) => stepped(history, query),
    dirty,
    save: () => {
      const snapshot = history.edits();
      const run = writing.then(() => write(snapshot));
      writing = run.catch(() => undefined);
      return run;
    },
  };
};
