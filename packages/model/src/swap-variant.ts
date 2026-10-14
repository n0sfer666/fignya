import type { DesignNode, InstanceNode, NodeId, NodeMap, Override } from "./node";
import { mergeOverride, pathKey } from "./override";
import { variantStylePatch } from "./variant-style";
import { twinPath, type SwappedAt } from "./variant-twin";

type Move = { nodes: NodeMap; from: NodeId; to: NodeId; at: readonly NodeId[]; swapped: SwappedAt };

const inside = (path: readonly NodeId[], at: readonly NodeId[]): boolean => path.length > at.length && at.every((id, i) => path[i] === id);

const moved = ({ nodes, from, to, at, swapped }: Move, override: Override, rest: readonly NodeId[]): Override[] => {
  const twin = twinPath(nodes, from, to, rest, swapped);
  return twin ? [{ ...override, path: [...at, ...twin] }] : [];
};

const componentAt = (overrides: readonly Override[], path: readonly NodeId[]): NodeId | undefined =>
  overrides.find((o) => pathKey(o.path) === pathKey(path))?.componentId;

const withCarried = (overrides: Override[], carried: Override[]): Override[] => {
  const byKey = new Map(carried.map((o) => [pathKey(o.path), o]));
  const own = new Set(overrides.map((o) => pathKey(o.path)));
  return [...overrides.map((o) => mergeOverride(byKey.get(pathKey(o.path)), o)), ...carried.filter((o) => !own.has(pathKey(o.path)))];
};

const carriedOf = (move: Move, stored: InstanceNode, point: Override | undefined): Override[] =>
  move.at.length === 0 || point?.componentId !== undefined
    ? []
    : stored.overrides.flatMap((o) => moved({ ...move, swapped: (prefix) => move.swapped(prefix) ?? componentAt(stored.overrides, prefix) }, o, o.path));

const swappedPoint = (stored: InstanceNode, point: Override | undefined, source: DesignNode, target: DesignNode, at: NodeId[]): Override => {
  const style = { ...point?.style, ...variantStylePatch({ ...stored.style, ...point?.style }, source.style, target.style) };
  return { ...point, path: at, componentId: target.id, swaps: target.swaps ?? [], ...(Object.keys(style).length > 0 ? { style } : {}) };
};

export const swapVariant = (nodes: NodeMap, outer: InstanceNode, path: NodeId[], to: NodeId): InstanceNode | undefined => {
  const last = path.at(-1);
  const stored = last === undefined ? outer : nodes.get(last);
  const target = nodes.get(to);
  if (stored?.kind !== "instance" || !target) return undefined;
  const key = pathKey(path);
  const point = last === undefined ? undefined : outer.overrides.find((o) => pathKey(o.path) === key);
  const from = point?.componentId ?? stored.componentId;
  const source = nodes.get(from);
  if (from === to) return outer;
  if (!source) return undefined;
  const move: Move = { nodes, from, to, at: path, swapped: (prefix) => componentAt(outer.overrides, [...path, ...prefix]) };
  const overrides = outer.overrides.flatMap((o) => (inside(o.path, path) ? moved(move, o, o.path.slice(path.length)) : pathKey(o.path) === key ? [] : [o]));
  const carried = withCarried(overrides, carriedOf(move, stored, point));
  if (last !== undefined) return { ...outer, overrides: [...carried, swappedPoint(stored, point, source, target, path)] };
  const style = { ...outer.style, ...variantStylePatch(outer.style, source.style, target.style) };
  return { ...outer, componentId: to, style, overrides: carried, swaps: target.swaps ?? [] };
};
