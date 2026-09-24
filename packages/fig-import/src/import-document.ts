import type { DesignDocument, DesignNode, NodeId } from "@fignya/model";
import type { Rec } from "./fig/guards";
import { convertNode } from "./convert/convert-node";
import { blobPaths, VECTOR_TYPES } from "./convert/vector";
import { buildIndex, type FigNode } from "./tree/node-index";
import { pagesOf } from "./tree/pages";

export const SERVICE_PAGES: ReadonlySet<string> = new Set(["Internal Only Canvas"]);

const SKIPPED_TYPES = new Set(["SLICE", "STICKY", "CONNECTOR", "WIDGET"]);

export const importDocument = (message: Rec): DesignDocument => {
  const index = buildIndex(message);
  const pathOf = blobPaths(index.blobs);
  const nodes = new Map<NodeId, DesignNode>();
  const visit = (node: FigNode, parent: FigNode, parentId: NodeId | undefined): NodeId[] => {
    if (SKIPPED_TYPES.has(node.type)) return [];
    const children = VECTOR_TYPES.has(node.type) ? [] : node.children.flatMap((child) => visit(child, node, node.key));
    nodes.set(node.key, convertNode(node, { parent: parent.raw, parentId, children }, pathOf));
    return [node.key];
  };
  const canvases = index.root.children.filter((c) => c.type === "CANVAS");
  for (const canvas of canvases) for (const child of canvas.children) visit(child, canvas, undefined);
  return { nodes, pages: pagesOf(canvases, SERVICE_PAGES) };
};
