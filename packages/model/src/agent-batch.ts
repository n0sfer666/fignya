import type { Rejection } from "./agent-edit";
import { createInstanceCounter, enclosingComponent, type InstanceCounter } from "./component-instances";
import type { Edit, StylePatch } from "./edit";
import { boxOf, touchesBox, withBox } from "./edit-box";
import type { NodeMap } from "./node";
import { pathKey } from "./override";
import { resolveChain } from "./resolve-chain";

export type BatchRejection = Rejection & { index: number };

type Prepared = Edit | Rejection;

const guardComponent = (nodes: NodeMap, edit: Edit, count: InstanceCounter): Rejection | undefined => {
  const head = nodes.get(edit.target[0] ?? "");
  const owner = head && enclosingComponent(nodes, head);
  const instances = owner ? count(owner.id) : 0;
  return owner && instances > 0
    ? { reason: `edits main component "${owner.name}" used by ${instances} instances; pass affectsInstances: true to apply` }
    : undefined;
};

export const prepareBatch = (nodes: NodeMap, edits: readonly Edit[], affectsInstances: boolean): Edit[] | BatchRejection => {
  const count = createInstanceCounter(nodes);
  const boxes = new Map<string, StylePatch>();
  const prepare = (edit: Edit): Prepared => {
    const resolved = resolveChain(nodes, edit.target);
    if (!resolved) return { reason: "no node at this address" };
    if (edit.text !== undefined && resolved.node.kind !== "text") return { reason: "text is editable only on text nodes" };
    const guarded = affectsInstances ? undefined : guardComponent(nodes, edit, count);
    if (guarded) return guarded;
    if (!edit.style || !touchesBox(edit.style)) return edit;
    const key = pathKey(edit.target);
    const style = withBox(edit.style, boxes.get(key) ?? boxOf(resolved.node.style), edit.target);
    boxes.set(key, boxOf(style));
    return { ...edit, style };
  };
  const prepared: Edit[] = [];
  for (const [index, edit] of edits.entries()) {
    const result = prepare(edit);
    if ("reason" in result) return { index, reason: result.reason };
    prepared.push(result);
  }
  return prepared;
};
