import type { Edit, EditChange } from "@fignya/model";
import type { LoadedDocument } from "./load-document";

export type DocumentEditor = { edit: (edit: Edit) => Promise<void>; undo: () => void; redo: () => void };

type Step = (doc: LoadedDocument) => Promise<EditChange | undefined>;

export const createDocumentEditor = (loaded: Promise<LoadedDocument>, applied: (change: EditChange | undefined) => void): DocumentEditor => {
  const report = (change: EditChange | undefined): void => {
    if (change) applied(change);
  };
  const step = (run: Step) => (): void => {
    loaded
      .then(run)
      .then(report)
      .catch((error: unknown) => console.error(`fignya: history step failed: ${String(error)}`));
  };
  return {
    edit: async (edit) => applied(await (await loaded).edit(edit)),
    undo: step((doc) => doc.undo()),
    redo: step((doc) => doc.redo()),
  };
};
