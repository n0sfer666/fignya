import type { Edit, EditChange } from "@fignya/model";
import type { Edited } from "./import-client";
import type { LoadedDocument } from "./load-document";

export type EditableDocument = Pick<LoadedDocument, "edit" | "undo" | "redo" | "save">;

export type DocumentEditor = { edit: (edit: Edit) => Promise<void>; undo: () => void; redo: () => void; save: () => Promise<void>; dirty: () => boolean };

export type EditorEvents = { applied: (change: EditChange | undefined) => void; dirty: (dirty: boolean) => void };

type Step = (doc: EditableDocument) => Promise<Edited>;

export const createDocumentEditor = (loaded: Promise<EditableDocument>, events: EditorEvents): DocumentEditor => {
  let dirty = false;
  let running = 0;
  let idle: Promise<unknown> = Promise.resolve();
  const mark = (next: boolean): void => {
    dirty = next;
    events.dirty(next);
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
    tracked(
      loaded.then(run).then(({ change, dirty: next }) => {
        mark(next);
        if (change) events.applied(change);
      }),
    ).catch((error: unknown) => console.error(`fignya: history step failed: ${String(error)}`));
  };
  return {
    edit: (edit) =>
      tracked(
        loaded.then(async (doc) => {
          const { change, dirty: next } = await doc.edit(edit);
          mark(next);
          events.applied(change);
        }),
      ),
    undo: step((doc) => doc.undo()),
    redo: step((doc) => doc.redo()),
    save: async () => {
      await idle;
      if (dirty) mark(await (await loaded).save());
    },
    dirty: () => dirty || running > 0,
  };
};
