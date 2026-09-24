import type { Page, Screen } from "@fignya/model";
import { num, rec, str } from "../fig/guards";
import type { FigNode } from "./node-index";

const offset = (node: FigNode): { x: number; y: number } => {
  const t = rec(node.raw, "transform");
  return { x: num(t, "m02") ?? 0, y: num(t, "m12") ?? 0 };
};

const collect = (node: FigNode, ox: number, oy: number, out: Screen[]): void => {
  for (const child of node.children) {
    if (child.raw.visible === false) continue;
    const { x, y } = offset(child);
    if (child.type === "SECTION") collect(child, ox + x, oy + y, out);
    if (child.type !== "FRAME") continue;
    const size = rec(child.raw, "size");
    out.push({ id: child.key, name: str(child.raw, "name") ?? child.key, x: ox + x, y: oy + y, width: num(size, "x") ?? 0, height: num(size, "y") ?? 0 });
  }
};

const screensOf = (page: FigNode): Screen[] => {
  const out: Screen[] = [];
  collect(page, 0, 0, out);
  return out;
};

const nameOf = (page: FigNode): string => str(page.raw, "name") ?? page.key;

export const pagesOf = (canvases: FigNode[], excluded: ReadonlySet<string>): Page[] =>
  canvases.filter((c) => !excluded.has(nameOf(c))).map((c) => ({ id: c.key, name: nameOf(c), screens: screensOf(c) }));
