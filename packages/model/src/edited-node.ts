import type { Edit } from "./edit";
import type { DesignNode, InstanceNode, NodeId, NodeMap, Override } from "./node";
import { pathKey } from "./override";

const ownEdit = (node: DesignNode, { style, text }: Edit): DesignNode => {
  const patched = style ? { ...node, style: { ...node.style, ...style } } : node;
  return patched.kind === "text" && text !== undefined ? { ...patched, text } : patched;
};

const overrideEdit = (instance: InstanceNode, path: NodeId[], { style, text }: Edit): InstanceNode => {
  const key = pathKey(path);
  const current = instance.overrides.find((o) => pathKey(o.path) === key);
  const next: Override = {
    ...current,
    path,
    ...(style ? { style: { ...current?.style, ...style } } : {}),
    ...(text === undefined ? {} : { text }),
  };
  const overrides = current ? instance.overrides.map((o) => (o === current ? next : o)) : [...instance.overrides, next];
  return { ...instance, overrides };
};

const isEmpty = ({ style, text }: Edit): boolean => style === undefined && text === undefined;

export const editedNode = (nodes: NodeMap, edit: Edit): DesignNode | undefined => {
  const [headId, ...path] = edit.target;
  const head = headId === undefined ? undefined : nodes.get(headId);
  const last = nodes.get(edit.target.at(-1) ?? "");
  if (!head || !last || isEmpty(edit) || path.some((id) => !nodes.has(id))) return undefined;
  if (edit.text !== undefined && last.kind !== "text") return undefined;
  if (path.length === 0) return ownEdit(head, edit);
  return head.kind === "instance" ? overrideEdit(head, path, edit) : undefined;
};
