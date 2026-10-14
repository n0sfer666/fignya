import type { Edit } from "./edit";
import { editedNode } from "./edited-node";
import type { DesignNode, NodeId } from "./node";

export type RestoredEdits = { applied: Edit[]; skipped: number };

const tried = (nodes: Map<NodeId, DesignNode>, edit: Edit): DesignNode | undefined => {
  try {
    return editedNode(nodes, edit);
  } catch {
    return undefined;
  }
};

export const restoreEdits = (nodes: Map<NodeId, DesignNode>, edits: readonly Edit[]): RestoredEdits => {
  const applied: Edit[] = [];
  for (const edit of edits) {
    const after = tried(nodes, edit);
    if (!after) continue;
    nodes.set(after.id, after);
    applied.push(edit);
  }
  return { applied, skipped: edits.length - applied.length };
};
