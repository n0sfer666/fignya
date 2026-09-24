import { cssText, expandedComponentId, type DesignNode, type ImageUrl, type NodeId, type NodeMap, type Style } from "@fignya/model";
import { renderSvg } from "./svg";

export type RenderContext = { nodes: NodeMap; imageUrl: ImageUrl };

type Branch = { depth: number; expanding: ReadonlySet<NodeId> };

const MAX_DEPTH = 64;

const IN_FLOW: Style = { position: "relative", left: undefined, top: undefined, transform: undefined };

const childrenOf = (ctx: RenderContext, node: DesignNode, branch: Branch): { ids: NodeId[]; branch: Branch } => {
  const depth = branch.depth + 1;
  const componentId = expandedComponentId(node);
  if (componentId === undefined) {
    const ids = node.kind === "text" || node.kind === "vector" ? [] : node.children;
    return { ids, branch: { depth, expanding: branch.expanding } };
  }
  if (branch.expanding.has(componentId)) return { ids: [], branch };
  const ids = ctx.nodes.get(componentId)?.children ?? [];
  return { ids, branch: { depth, expanding: new Set([...branch.expanding, componentId]) } };
};

const renderTree = (ctx: RenderContext, id: NodeId, branch: Branch, style: (node: DesignNode) => Style): HTMLElement | undefined => {
  const node = ctx.nodes.get(id);
  if (!node || node.hidden || branch.depth > MAX_DEPTH) return undefined;
  const el = document.createElement("div");
  el.dataset.id = node.id;
  el.dataset.kind = node.kind;
  el.style.cssText = cssText(style(node), ctx.imageUrl);
  if (node.kind === "text") el.textContent = node.text;
  if (node.kind === "vector") el.append(renderSvg(node.paths));
  const children = childrenOf(ctx, node, branch);
  for (const childId of children.ids) {
    const child = renderTree(ctx, childId, children.branch, (n) => n.style);
    if (child) el.append(child);
  }
  return el;
};

export const renderRoot = (ctx: RenderContext, rootId: NodeId): HTMLElement | undefined =>
  renderTree(ctx, rootId, { depth: 0, expanding: new Set() }, (n) => ({ ...n.style, ...IN_FLOW }));
