import { compactEdits } from "./compact-edits";
import type { Edit } from "./edit";
import { editedNode } from "./edited-node";
import type { DesignNode, NodeId } from "./node";

export type EditOrigin = "user" | "agent";

export type HistoryTop = { step: number; origin: EditOrigin };

export type ApplyFailure = { failed: number };

export type EditHistory = {
  apply: (edits: readonly Edit[], origin: EditOrigin) => NodeId[][] | ApplyFailure;
  undo: () => NodeId[][] | undefined;
  redo: () => NodeId[][] | undefined;
  top: () => HistoryTop | undefined;
  edits: () => Edit[];
};

type Entry = { edit: Edit; before: DesignNode; after: DesignNode };

type Step = { id: number; origin: EditOrigin; entries: Entry[] };

const HISTORY_LIMIT = 200;

const targetsOf = (step: Step): NodeId[][] => step.entries.map((entry) => entry.edit.target);

export const createEditHistory = (nodes: Map<NodeId, DesignNode>, seed: readonly Edit[] = []): EditHistory => {
  let base: Edit[] = compactEdits(seed);
  let lastId = 0;
  const done: Step[] = [];
  const undone: Step[] = [];
  const revert = (entries: readonly Entry[]): void => {
    for (const entry of [...entries].reverse()) nodes.set(entry.before.id, entry.before);
  };
  const applyEntry = (edit: Edit): Entry | undefined => {
    const before = nodes.get(edit.target[0] ?? "");
    const after = editedNode(nodes, edit);
    if (!before || !after) return undefined;
    nodes.set(after.id, after);
    return { edit, before, after };
  };
  return {
    apply: (edits, origin) => {
      const entries: Entry[] = [];
      for (const [index, edit] of edits.entries()) {
        const entry = applyEntry(edit);
        if (!entry) {
          revert(entries);
          return { failed: index };
        }
        entries.push(entry);
      }
      if (entries.length === 0) return { failed: 0 };
      lastId += 1;
      const step: Step = { id: lastId, origin, entries };
      done.push(step);
      const forgotten = done.length > HISTORY_LIMIT ? done.shift() : undefined;
      if (forgotten) base = compactEdits([...base, ...forgotten.entries.map((entry) => entry.edit)]);
      undone.length = 0;
      return targetsOf(step);
    },
    undo: () => {
      const step = done.pop();
      if (!step) return undefined;
      revert(step.entries);
      undone.push(step);
      return targetsOf(step);
    },
    redo: () => {
      const step = undone.pop();
      if (!step) return undefined;
      for (const entry of step.entries) nodes.set(entry.after.id, entry.after);
      done.push(step);
      return targetsOf(step);
    },
    top: () => {
      const step = done.at(-1);
      return step ? { step: step.id, origin: step.origin } : undefined;
    },
    edits: () => compactEdits([...base, ...done.flatMap((step) => step.entries.map((entry) => entry.edit))]),
  };
};
