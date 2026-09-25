import type { DesignDocument, DesignNode, NodeId } from "@fignya/model";
import { recs, type Rec } from "./fig/guards";
import { convertNode, type ConvertContext } from "./convert/convert-node";
import { instanceOverrides } from "./convert/instance-overrides";
import { blobPaths } from "./convert/vector";
import { drain } from "./drain";
import { PROGRESS_EVERY, type ImportProgress } from "./import-progress";
import { blobsOf, buildIndex, type NodeIndex } from "./tree/node-index";
import { pagesOf } from "./tree/pages";
import { childIdsOf, placementsOf } from "./tree/placements";

export const SERVICE_PAGES: ReadonlySet<string> = new Set(["Internal Only Canvas"]);

export function* convertSteps(index: NodeIndex): Generator<ImportProgress, DesignDocument> {
  const pathOf = blobPaths(index.blobs);
  const ctx: ConvertContext = { pathOf, overridesOf: instanceOverrides(index.byKey, pathOf) };
  const canvases = index.root.children.filter((c) => c.type === "CANVAS");
  const placements = placementsOf(canvases);
  const nodes = new Map<NodeId, DesignNode>();
  for (const [done, { node, parent, parentId }] of placements.entries()) {
    if (done % PROGRESS_EVERY === 0) yield { phase: "convert", done, total: placements.length };
    nodes.set(node.key, convertNode(node, { parent: parent.raw, parentId, children: childIdsOf(node) }, ctx));
  }
  return { nodes, pages: pagesOf(canvases, SERVICE_PAGES) };
}

export const importDocument = (message: Rec): DesignDocument =>
  drain(convertSteps(buildIndex(recs(message, "nodeChanges"), blobsOf(message))));
