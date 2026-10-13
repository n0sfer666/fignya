import type { DesignDocument } from "./document";
import type { DesignNode } from "./node";

export const parentOf = (doc: DesignDocument, node: DesignNode): DesignNode | undefined =>
  node.parentId === undefined ? undefined : doc.nodes.get(node.parentId);
