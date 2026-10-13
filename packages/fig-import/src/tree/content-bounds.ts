import type { Box } from "@fignya/model";
import { clipsContent } from "../fig/clips-content";
import { num, rec, type Rec } from "../fig/guards";
import type { FigNode } from "./node-index";
import { childrenOf } from "./placements";

type Affine = readonly [number, number, number, number, number, number];
type Edges = { left: number; top: number; right: number; bottom: number };

const EPSILON = 0.01;
const MAX_SPILL = 6000;

const affineOf = (raw: Rec): Affine => {
  const t = rec(raw, "transform");
  return [num(t, "m00") ?? 1, num(t, "m01") ?? 0, num(t, "m02") ?? 0, num(t, "m10") ?? 0, num(t, "m11") ?? 1, num(t, "m12") ?? 0];
};

const compose = (a: Affine, b: Affine): Affine => [
  a[0] * b[0] + a[1] * b[3],
  a[0] * b[1] + a[1] * b[4],
  a[0] * b[2] + a[1] * b[5] + a[2],
  a[3] * b[0] + a[4] * b[3],
  a[3] * b[1] + a[4] * b[4],
  a[3] * b[2] + a[4] * b[5] + a[5],
];

const sizeOf = (raw: Rec): { width: number; height: number } => {
  const size = rec(raw, "size");
  return { width: num(size, "x") ?? 0, height: num(size, "y") ?? 0 };
};

const edgesOf = (m: Affine, raw: Rec): Edges => {
  const { width, height } = sizeOf(raw);
  const corners: [number, number][] = [[0, 0], [width, 0], [0, height], [width, height]];
  const xs = corners.map(([x, y]) => m[0] * x + m[1] * y + m[2]);
  const ys = corners.map(([x, y]) => m[3] * x + m[4] * y + m[5]);
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
};

const unite = (a: Edges, b: Edges): Edges => ({
  left: Math.min(a.left, b.left),
  top: Math.min(a.top, b.top),
  right: Math.max(a.right, b.right),
  bottom: Math.max(a.bottom, b.bottom),
});

export const shown = (node: FigNode): boolean => node.raw.visible !== false && (num(node.raw, "opacity") ?? 1) > 0;

const apart = (a: Edges, b: Edges): boolean => a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom;

const childrenExtent = (node: FigNode, m: Affine, start: Edges, limit: Edges): Edges =>
  childrenOf(node)
    .filter(shown)
    .map((child) => extentOf(child, compose(m, affineOf(child.raw)), limit))
    .filter((extent) => !apart(extent, limit))
    .reduce(unite, start);

const extentOf = (node: FigNode, m: Affine, limit: Edges): Edges => {
  const own = edgesOf(m, node.raw);
  return clipsContent(node.raw, node.type) ? own : childrenExtent(node, m, own, limit);
};

export const contentBounds = (frame: FigNode): Box | undefined => {
  if (clipsContent(frame.raw, frame.type)) return undefined;
  const { width, height } = sizeOf(frame.raw);
  const limit = { left: -MAX_SPILL, top: -MAX_SPILL, right: width + MAX_SPILL, bottom: height + MAX_SPILL };
  const spill = childrenExtent(frame, [1, 0, 0, 0, 1, 0], { left: 0, top: 0, right: width, bottom: height }, limit);
  const edges = {
    left: Math.max(spill.left, limit.left),
    top: Math.max(spill.top, limit.top),
    right: Math.min(spill.right, limit.right),
    bottom: Math.min(spill.bottom, limit.bottom),
  };
  const grows = edges.left < -EPSILON || edges.top < -EPSILON || edges.right > width + EPSILON || edges.bottom > height + EPSILON;
  return grows ? { x: edges.left, y: edges.top, width: edges.right - edges.left, height: edges.bottom - edges.top } : undefined;
};
