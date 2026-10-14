import { round } from "./css-values";
import { expandedComponentId } from "./instance";
import type { DesignNode, NodeId, NodeMap } from "./node";
import { applyOverride } from "./override";
import { nestedScope, type OverrideScope } from "./override-scope";

const TEXT_LIMIT = 60;

const INSTANCE_TEXTS = 5;

const WALK_LIMIT = 500;

export const clip = (text: string): string => {
  const line = text.replaceAll(/\s+/g, " ").trim();
  return line.length > TEXT_LIMIT ? `${line.slice(0, TEXT_LIMIT - 1)}…` : line;
};

const num = (value: number | undefined): string => (value === undefined ? "?" : String(round(value, 1)));

const isVariantSet = (nodes: NodeMap, parent: DesignNode): boolean =>
  parent.kind !== "instance" && parent.children.every((id) => nodes.get(id)?.kind === "component");

export const componentLabel = (nodes: NodeMap, componentId: NodeId): string => {
  const component = nodes.get(componentId);
  const parent = component?.parentId === undefined ? undefined : nodes.get(component.parentId);
  if (!component) return componentId;
  return parent && isVariantSet(nodes, parent) ? `${parent.name} / ${component.name}` : component.name;
};

export const instanceTexts = (nodes: NodeMap, instance: DesignNode, scope: OverrideScope): string[] => {
  const texts: string[] = [];
  let visited = 0;
  const walk = (node: DesignNode, outer: OverrideScope): void => {
    const componentId = expandedComponentId(node);
    const component = componentId === undefined ? undefined : nodes.get(componentId);
    const inner = component ? nestedScope(outer, node) : outer;
    for (const id of (component ?? node).children) {
      const stored = nodes.get(id);
      const child = stored && applyOverride(stored, inner.get(id));
      visited += 1;
      if (!child || child.hidden || texts.length >= INSTANCE_TEXTS || visited > WALK_LIMIT) continue;
      if (child.kind === "text") texts.push(clip(child.text));
      else walk(child, inner);
    }
  };
  walk(instance, scope);
  return texts;
};

const detailOf = (nodes: NodeMap, node: DesignNode, scope: OverrideScope): string => {
  if (node.kind === "text") return ` ${JSON.stringify(clip(node.text))}`;
  if (node.kind !== "instance") return "";
  const texts = instanceTexts(nodes, node, scope).map((text) => JSON.stringify(text));
  return ` of ${JSON.stringify(componentLabel(nodes, node.componentId))}${texts.length > 0 ? ` texts ${texts.join(" ")}` : ""}`;
};

export const outlineLine = (nodes: NodeMap, node: DesignNode, chain: readonly NodeId[], scope: OverrideScope, depth: number): string => {
  const { left, top, width, height } = node.style;
  const box = `${num(left)},${num(top)} ${num(width)}×${num(height)}`;
  return `${"  ".repeat(depth)}${chain.join("/")} ${JSON.stringify(node.name)} ${node.kind} ${box}${detailOf(nodes, node, scope)}`;
};
