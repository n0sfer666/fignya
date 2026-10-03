import { bool, bytes, num, rec, recs, str, type Rec } from "../../packages/fig-import/src/fig/guards";
import { guidKey, type FigNode } from "../../packages/fig-import/src/tree/node-index";
import { figIndex } from "./fig-index";

const [id = "", depthArg = "3"] = process.argv.slice(2);
const maxDepth = Number(depthArg);
const { byKey } = figIndex();
const round = (v: number | undefined): string => (v === undefined ? "?" : String(Math.round(v * 100) / 100));

const paints = (raw: Rec, key: string): string =>
  recs(raw, key)
    .filter((p) => bool(p, "visible") !== false)
    .map((p) => `${str(p, "type")}${str(p, "type") === "IMAGE" ? `(${bytes(rec(p, "image"), "hash") ? "hash" : "nohash"})` : ""}`)
    .join("+");

const line = (node: FigNode): string => {
  const raw = node.raw;
  const size = rec(raw, "size");
  const t = rec(raw, "transform");
  const strokes = paints(raw, "strokePaints");
  const parts = [
    `${node.key} ${node.type} «${str(raw, "name")}»`,
    `${round(num(size, "x"))}×${round(num(size, "y"))} @${round(num(t, "m02"))},${round(num(t, "m12"))}`,
    bool(raw, "visible") === false ? "HIDDEN" : "",
    str(raw, "stackMode") ? `stack=${str(raw, "stackMode")}` : "",
    str(raw, "horizontalConstraint") ? `h=${str(raw, "horizontalConstraint")}` : "",
    paints(raw, "fillPaints") ? `fill=${paints(raw, "fillPaints")}` : "",
    strokes ? `stroke=${strokes}/${round(num(raw, "strokeWeight"))}` : "",
    node.type === "INSTANCE" ? `sym=${guidKey(rec(rec(raw, "symbolData"), "symbolID"))}` : "",
  ];
  return parts.filter(Boolean).join(" ");
};

const walk = (node: FigNode, depth: number): void => {
  console.log(`${"  ".repeat(depth)}${line(node)}`);
  if (depth < maxDepth) for (const child of node.children) walk(child, depth + 1);
};

const root = byKey.get(id);
if (!root) {
  console.log(`${id}: not found`);
  process.exit(1);
}
walk(root, 0);
