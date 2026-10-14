import type { BatchRejection, Edit, EditChange, EditOrigin, HistoryTop } from "@fignya/model";
import type { Edited, EditReply } from "./import-client";
import type { LoadedDocument } from "./load-document";

export type EditableDocument = Pick<LoadedDocument, "edit" | "batch" | "undo" | "undoAgent" | "redo" | "save">;

export type DocumentEditor = {
  edit: (edit: Edit) => Promise<void>;
  batch: (edits: Edit[], affectsInstances: boolean) => Promise<EditReply>;
  undo: () => void;
  undoAgent: () => Promise<Edited>;
  redo: () => void;
  save: () => Promise<void>;
  dirty: () => boolean;
};

export type EditorEvents = {
  applied: (changes: EditChange[], origin: EditOrigin) => void;
  dirty: (dirty: boolean) => void;
  top: (top: HistoryTop | undefined) => void;
};

type Step = (doc: EditableDocument) => Promise<Edited>;

const isRejection = (reply: EditReply): reply is BatchRejection => "index" in reply;

export const createDocumentEditor = (loaded: Promise<EditableDocument>, events: EditorEvents): DocumentEditor => {
  let dirty = false;
  let running = 0;
  let idle: Promise<unknown> = Promise.resolve();
  const mark = (next: boolean): void => {
    dirty = next;
    events.dirty(next);
  };
  const land = (edited: Edited, origin: EditOrigin, always: boolean): void => {
    mark(edited.dirty);
    events.top(edited.top);
    if (always || edited.changes.length > 0) events.applied(edited.changes, origin);
  };
  const tracked = <T>(run: Promise<T>): Promise<T> => {
    running += 1;
    const done = run.finally(() => {
      running -= 1;
    });
    idle = Promise.allSettled([idle, done]).then(() => undefined);
    return done;
  };
  const step = (run: Step) => (): void => {
    tracked(loaded.then(run).then((edited) => land(edited, "user", false))).catch((error: unknown) =>
      console.error(`fignya: history step failed: ${String(error)}`),
    );
  };
  return {
    edit: (edit) => tracked(loaded.then(async (doc) => land(await doc.edit(edit), "user", true))),
    batch: (edits, affectsInstances) =>
      tracked(
        loaded.then(async (doc) => {
          const reply = await doc.batch(edits, affectsInstances);
          if (!isRejection(reply)) land(reply, "agent", true);
          return reply;
        }),
      ),
    undo: step((doc) => doc.undo()),
    undoAgent: () =>
      tracked(
        loaded.then(async (doc) => {
          const edited = await doc.undoAgent();
          land(edited, "agent", false);
          return edited;
        }),
      ),
    redo: step((doc) => doc.redo()),
    save: async () => {
      await idle;
      if (dirty) mark(await (await loaded).save());
    },
    dirty: () => dirty || running > 0,
  };
};
