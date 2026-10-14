import type { FigImport } from "@fignya/fig-import";
import { editValues, inspect, locateNode, outline, prepareBatch, resolveChain, type NodeId } from "@fignya/model";
import type { EditQuery, ImporterEvent, NodeDetails, ReadQuery } from "./protocol";

type BatchQuery = Extract<EditQuery, { type: "batch" }>;

type Rejected = Extract<ImporterEvent, { type: "rejected" }>;

const IMAGE_URL = (hash: string): string => `image:${hash}`;

const detailsOf = ({ document }: FigImport, address: NodeId[]): NodeDetails | undefined => {
  const resolved = resolveChain(document.nodes, address);
  const hit = resolved && locateNode(document, address);
  if (!resolved || !hit) return undefined;
  const { node } = resolved;
  const component = node.kind === "instance" ? document.nodes.get(node.componentId) : undefined;
  return { hit, inspection: inspect(node, component, IMAGE_URL), values: editValues(node.style) };
};

export const readReply = (doc: FigImport, query: ReadQuery): ImporterEvent =>
  query.type === "outline"
    ? { type: "outlined", reqId: query.reqId, text: outline(doc.document.nodes, query.address, query.limit) }
    : { type: "inspected", reqId: query.reqId, details: detailsOf(doc, query.address) };

export const preparedBatch = (doc: FigImport, query: BatchQuery): BatchQuery | Rejected => {
  const prepared = prepareBatch(doc.document.nodes, query.edits, query.affectsInstances);
  return "reason" in prepared ? { type: "rejected", reqId: query.reqId, index: prepared.index, reason: prepared.reason } : { ...query, edits: prepared };
};
