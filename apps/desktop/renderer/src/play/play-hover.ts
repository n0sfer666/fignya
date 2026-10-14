import { pathKey, type NodeId, type SwapEvent } from "@fignya/model";
import { editTarget } from "../canvas/edit-target";
import { swapsOfElement } from "./play-swaps";
import type { Restore, Variants } from "./play-variants";

export type Hover = (path: readonly EventTarget[]) => void;

type Hovered = { el: Element; chain: NodeId[] };

const POINTER_EVENTS: ReadonlySet<SwapEvent> = new Set<SwapEvent>(["hover", "enter", "leave"]);

const hoveredOn = (path: readonly EventTarget[]): Map<string, Hovered> => {
  const hovered = new Map<string, Hovered>();
  for (const el of path) {
    const chain = el instanceof Element && el.hasAttribute("data-id") ? editTarget(el) : undefined;
    if (el instanceof Element && chain) hovered.set(pathKey(chain), { el, chain });
  }
  return hovered;
};

export const createHover = (variants: Variants): Hover => {
  const holders = new Map<string, NodeId[]>();
  const restores = new Map<string, Restore>();
  const swapOn = (el: Element, on: SwapEvent): Restore[] =>
    swapsOfElement(el)
      .filter((s) => s.on === on)
      .flatMap((s) => variants.swap(el, s.to) ?? []);
  const enter = (key: string, { el: seen, chain }: Hovered): void => {
    holders.set(key, chain);
    const el = variants.element(chain) ?? seen;
    for (const restore of swapOn(el, "hover")) if (!restores.has(pathKey(restore.chain))) restores.set(pathKey(restore.chain), restore);
    swapOn(el, "enter");
  };
  const leave = (key: string, chain: NodeId[]): void => {
    holders.delete(key);
    const el = variants.element(chain);
    if (el) swapOn(el, "leave");
  };
  return (path) => {
    const hovered = hoveredOn(path);
    const held = new Set<NodeId | undefined>();
    for (const [key, restore] of [...restores].reverse()) {
      if (hovered.has(key)) held.add(restore.chain[0]);
      if (hovered.has(key) || held.has(restore.chain[0])) continue;
      restores.delete(key);
      variants.restore(restore);
    }
    for (const [key, chain] of [...holders]) if (!hovered.has(key)) leave(key, chain);
    for (const [key, item] of hovered) if (!holders.has(key) && swapsOfElement(item.el).some((s) => POINTER_EVENTS.has(s.on))) enter(key, item);
  };
};
