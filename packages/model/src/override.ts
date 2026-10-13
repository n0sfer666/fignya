import type { DesignNode, NodeId, Override } from "./node";

export const pathKey = (path: readonly NodeId[]): string => path.join("/");

export const mergeOverride = (inner: Override | undefined, outer: Override): Override =>
  inner ? { ...inner, ...outer, ...(inner.style || outer.style ? { style: { ...inner.style, ...outer.style } } : {}) } : outer;

export const applyOverride = (node: DesignNode, override: Override | undefined): DesignNode => {
  if (!override) return node;
  const { style, hidden, text, paths, componentId } = override;
  const base = { ...node, ...(style ? { style: { ...node.style, ...style } } : {}), ...(hidden === undefined ? {} : { hidden }) };
  if (base.kind === "text" && text !== undefined) return { ...base, text };
  if (base.kind === "vector" && paths) return { ...base, paths };
  if (base.kind === "instance" && componentId !== undefined) return { ...base, componentId };
  return base;
};
