import { isRec, rec, recs, str, num, type Rec } from "../fig/guards";

export type FigNode = {
  key: string;
  type: string;
  raw: Rec;
  children: FigNode[];
};

export type NodeIndex = {
  root: FigNode;
  byKey: Map<string, FigNode>;
  blobs: Uint8Array[];
};

export const guidKey = (guid: Rec | undefined): string =>
  guid ? `${num(guid, "sessionID") ?? 0}:${num(guid, "localID") ?? 0}` : "";

const position = (n: FigNode): string => str(rec(n.raw, "parentIndex"), "position") ?? "";

const comparePosition = (a: FigNode, b: FigNode): number => {
  const pa = position(a);
  const pb = position(b);
  return pa < pb ? -1 : pa > pb ? 1 : 0;
};

export const blobsOf = (message: Rec): Uint8Array[] =>
  recs(message, "blobs").map((b) => {
    const v = b.bytes;
    return v instanceof Uint8Array ? v : new Uint8Array();
  });

export const buildIndex = (nodeChanges: Rec[], blobs: Uint8Array[]): NodeIndex => {
  const byKey = new Map<string, FigNode>();
  for (const raw of nodeChanges) {
    const key = guidKey(rec(raw, "guid"));
    byKey.set(key, { key, type: str(raw, "type") ?? "UNKNOWN", raw, children: [] });
  }
  let root: FigNode | undefined;
  for (const node of byKey.values()) {
    const parentIndex = node.raw.parentIndex;
    const parent = isRec(parentIndex) ? byKey.get(guidKey(rec(parentIndex, "guid"))) : undefined;
    if (parent) parent.children.push(node);
    else if (node.type === "DOCUMENT") root = node;
  }
  if (!root) throw new Error("DOCUMENT node not found");
  for (const node of byKey.values()) node.children.sort(comparePosition);
  return { root, byKey, blobs };
};
