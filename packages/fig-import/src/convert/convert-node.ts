import type { DesignNode, NodeId, Style } from "@fignya/model";
import { rec, str, type Rec } from "../fig/guards";
import { guidKey, type FigNode } from "../tree/node-index";
import { decorationStyle } from "./decoration";
import { boxStyle, containerStyle } from "./layout";
import { paintsOf } from "./paint";
import { textOf, textStyle } from "./text";
import { VECTOR_TYPES, vectorPaths, type BlobPaths } from "./vector";

export type NodePlace = { parent: Rec; parentId?: NodeId; children: NodeId[] };

const componentKey = (raw: Rec): NodeId | undefined => {
  const symbol = rec(rec(raw, "symbolData") ?? {}, "symbolID");
  return symbol ? guidKey(symbol) : undefined;
};

const containerOf = (raw: Rec): Style => {
  const background = paintsOf(raw, "fillPaints");
  return background.length > 0 ? { ...containerStyle(raw), background } : containerStyle(raw);
};

export const convertNode = (node: FigNode, place: NodePlace, pathOf: BlobPaths): DesignNode => {
  const raw = node.raw;
  const isVector = VECTOR_TYPES.has(node.type);
  const style = { ...boxStyle(raw, place.parent), ...decorationStyle(raw, node.type, isVector) };
  const base = {
    id: node.key,
    name: str(raw, "name") ?? "",
    ...(place.parentId === undefined ? {} : { parentId: place.parentId }),
    children: place.children,
    ...(raw.visible === false ? { hidden: true } : {}),
  };
  if (node.type === "TEXT") return { ...base, kind: "text", style: { ...style, ...textStyle(raw) }, text: textOf(raw) };
  if (isVector) return { ...base, kind: "vector", style, paths: vectorPaths(raw, pathOf) };
  const container = { ...base, style: { ...style, ...containerOf(raw) } };
  const componentId = node.type === "INSTANCE" ? componentKey(raw) : undefined;
  if (componentId !== undefined) return { ...container, kind: "instance", componentId, overrides: [] };
  if (node.type === "SYMBOL") return { ...container, kind: "component" };
  return { ...container, kind: "frame" };
};
