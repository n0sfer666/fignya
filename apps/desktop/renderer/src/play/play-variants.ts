import { swapVariant, type InstanceNode, type NodeId, type NodeMap } from "@fignya/model";
import { renderedNode, rerender } from "@fignya/render-dom";
import { editTarget, findEditTarget } from "../canvas/edit-target";
import { swapTarget } from "./play-swaps";

export type Restore = { chain: NodeId[]; componentId: NodeId; before: InstanceNode; after: InstanceNode };

export type Variants = {
  swap: (holder: Element, to: NodeId) => Restore | undefined;
  restore: (restore: Restore) => void;
  element: (chain: NodeId[]) => Element | undefined;
};

type Applied = { before: InstanceNode; after: InstanceNode };

const currentComponent = (el: Element): NodeId | undefined => {
  const node = renderedNode(el)?.node;
  return node?.kind === "instance" ? node.componentId : undefined;
};

export const createVariants = (root: ShadowRoot, stored: NodeMap, onSwapped: (el: HTMLElement) => void): Variants => {
  const nodes = new Map(stored);
  const element = (chain: NodeId[]): Element | undefined => findEditTarget(root, chain);
  const put = (head: NodeId, node: InstanceNode): boolean => {
    const el = element([head]);
    if (!(el instanceof HTMLElement)) return false;
    nodes.set(head, node);
    const next = rerender(el, nodes);
    if (next) onSwapped(next);
    return true;
  };
  const apply = (chain: NodeId[], to: NodeId): Applied | undefined => {
    const [head, ...path] = chain;
    const outer = head === undefined ? undefined : nodes.get(head);
    if (head === undefined || outer?.kind !== "instance") return undefined;
    const swapped = swapVariant(nodes, outer, path, to);
    return swapped && swapped !== outer && put(head, swapped) ? { before: outer, after: swapped } : undefined;
  };
  return {
    swap: (holder, to) => {
      const target = swapTarget(holder, to, nodes);
      const chain = target && editTarget(target);
      const componentId = target && currentComponent(target);
      if (!chain || componentId === undefined) return undefined;
      const applied = apply(chain, to);
      return applied && { chain, componentId, ...applied };
    },
    restore: ({ chain, componentId, before, after }) => {
      const head = chain[0];
      if (head !== undefined && nodes.get(head) === after) put(head, before);
      else apply(chain, componentId);
    },
    element,
  };
};
