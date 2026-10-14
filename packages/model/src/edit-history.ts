import type { Edit } from "./edit";
import { editedNode } from "./edited-node";
import type { DesignNode, NodeId } from "./node";

export type EditHistory = {
  apply: (edit: Edit) => NodeId[] | undefined;
  undo: () => NodeId[] | undefined;
  redo: () => NodeId[] | undefined;
};

type Entry = { target: NodeId[]; before: DesignNode; after: DesignNode };

const HISTORY_LIMIT = 200;

export const createEditHistory = (nodes: Map<NodeId, DesignNode>): EditHistory => {
  const done: Entry[] = [];
  const undone: Entry[] = [];
  const move = (from: Entry[], to: Entry[], pick: (entry: Entry) => DesignNode): NodeId[] | undefined => {
    const entry = from.pop();
    if (!entry) return undefined;
    nodes.set(entry.before.id, pick(entry));
    to.push(entry);
    return entry.target;
  };
  return {
    apply: (edit) => {
      const before = nodes.get(edit.target[0] ?? "");
      const after = editedNode(nodes, edit);
      if (!before || !after) return undefined;
      nodes.set(after.id, after);
      done.push({ target: edit.target, before, after });
      if (done.length > HISTORY_LIMIT) done.shift();
      undone.length = 0;
      return edit.target;
    },
    undo: () => move(done, undone, (entry) => entry.before),
    redo: () => move(undone, done, (entry) => entry.after),
  };
};
