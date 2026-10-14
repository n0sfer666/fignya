import { applyOverride, cssText, EMPTY_SCOPE, expandedComponentId, nestedScope, type DesignNode, type ImageUrl, type NodeId, type NodeMap, type OverrideScope, type Style } from "@fignya/model";
import { carriesResize, constrainedStyle, hasOwnBox, resizeOf, type Resize } from "./constrain";
import { stackChildren } from "./flow-stacking";
import { rememberNode } from "./rendered-node";
import { rememberRerender } from "./rerender";
import { centerSvg, renderSvg } from "./svg";
import { viewBoxOf } from "./view-box";

export type RenderContext = { nodes: NodeMap; imageUrl: ImageUrl };

type Branch = { depth: number; expanding: ReadonlySet<NodeId>; scope: OverrideScope; resize?: Resize };

const MAX_DEPTH = 64;

const IN_FLOW: Style = { position: "relative", left: undefined, top: undefined, transform: undefined, centerTransform: undefined, margin: undefined, scale: undefined, contentSize: undefined };

const scalesContent = (stored: DesignNode, componentId: NodeId, component: DesignNode): boolean =>
  stored.kind === "instance" && stored.componentId !== componentId && component.style.display !== "flex";

const childrenOf = (ctx: RenderContext, node: DesignNode, stored: DesignNode, branch: Branch, inherited: Resize | undefined): { ids: NodeId[]; branch: Branch } => {
  const depth = branch.depth + 1;
  const componentId = expandedComponentId(node);
  if (componentId === undefined) {
    const ids = node.kind === "text" || node.kind === "vector" ? [] : node.children;
    return { ids, branch: { ...branch, depth, resize: resizeOf(stored.style, node.style, inherited, false) } };
  }
  const component = ctx.nodes.get(componentId);
  if (branch.expanding.has(componentId) || !component) return { ids: [], branch };
  const expanding = new Set([...branch.expanding, componentId]);
  const resize = resizeOf(component.style, node.style, inherited, scalesContent(stored, componentId, component));
  return { ids: component.children, branch: { depth, expanding, scope: nestedScope(branch.scope, node), resize } };
};

const renderTree = (ctx: RenderContext, id: NodeId, branch: Branch, style: (node: DesignNode) => Style): HTMLElement | undefined => {
  const stored = ctx.nodes.get(id);
  const override = branch.scope.get(id);
  const overridden = stored && applyOverride(stored, override);
  if (!stored || !overridden || overridden.hidden || branch.depth > MAX_DEPTH) return undefined;
  const node = !branch.resize || hasOwnBox(override?.style) ? overridden : { ...overridden, style: constrainedStyle(overridden, branch.resize) };
  const el = document.createElement("div");
  el.dataset.id = node.id;
  el.dataset.kind = node.kind;
  rememberNode(el, node, ctx.nodes);
  if (branch.expanding.size === 0 && expandedComponentId(node) !== undefined) rememberRerender(el, (nodes) => renderTree({ ...ctx, nodes }, id, branch, style));
  const own = style(node);
  el.style.cssText = cssText(own, ctx.imageUrl);
  if (node.kind === "text") el.textContent = node.text;
  const svg = node.kind === "vector" ? renderSvg(node.paths, ctx.imageUrl, viewBoxOf(stored, node.style, override?.paths)) : undefined;
  if (svg) el.append(own.contentSize ? centerSvg(svg, own.contentSize) : svg);
  const children = childrenOf(ctx, node, stored, branch, carriesResize(node.style, override?.style) ? branch.resize : undefined);
  const rendered = children.ids.flatMap((childId) => renderTree(ctx, childId, children.branch, (n) => n.style) ?? []);
  stackChildren(node.style, el, rendered);
  el.append(...rendered);
  return el;
};

export const renderRoot = (ctx: RenderContext, rootId: NodeId): HTMLElement | undefined =>
  renderTree(ctx, rootId, { depth: 0, expanding: new Set(), scope: EMPTY_SCOPE }, (n) => ({ ...n.style, ...IN_FLOW }));
