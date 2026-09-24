import { rec, num, str } from "../fig/guards";
import type { FigNode } from "./node-index";

export type Screen = {
  node: FigNode;
  page: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const offset = (node: FigNode): { x: number; y: number } => {
  const t = rec(node.raw, "transform");
  return { x: num(t, "m02") ?? 0, y: num(t, "m12") ?? 0 };
};

const collect = (node: FigNode, page: string, ox: number, oy: number, out: Screen[]): void => {
  for (const child of node.children) {
    if (child.raw.visible === false) continue;
    const { x, y } = offset(child);
    if (child.type === "SECTION") collect(child, page, ox + x, oy + y, out);
    if (child.type !== "FRAME") continue;
    const size = rec(child.raw, "size");
    out.push({ node: child, page, x: ox + x, y: oy + y, width: num(size, "x") ?? 0, height: num(size, "y") ?? 0 });
  }
};

export const pageScreens = (page: FigNode): Screen[] => {
  const out: Screen[] = [];
  collect(page, str(page.raw, "name") ?? page.key, 0, 0, out);
  return out;
};

export const pages = (root: FigNode, excluded: ReadonlySet<string>): FigNode[] =>
  root.children.filter((c) => c.type === "CANVAS" && !excluded.has(str(c.raw, "name") ?? ""));
