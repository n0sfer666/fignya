import type { Color, VectorPath } from "@fignya/model";
import { num, recs, str, type Rec } from "../fig/guards";
import { firstSolid } from "./paint";

export const VECTOR_TYPES: ReadonlySet<string> = new Set(["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE", "REGULAR_POLYGON"]);

export type BlobPaths = (index: number) => string | undefined;

const ARITY: Record<number, [string, number]> = { 0: ["Z", 0], 1: ["M", 2], 2: ["L", 2], 3: ["Q", 4], 4: ["C", 6] };

export const pathFromBlob = (blob: Uint8Array): string => {
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  const parts: string[] = [];
  let offset = 0;
  while (offset < blob.byteLength) {
    const spec = ARITY[view.getUint8(offset)];
    offset += 1;
    if (!spec) break;
    const [letter, count] = spec;
    if (offset + count * 4 > blob.byteLength) break;
    const values: number[] = [];
    for (let i = 0; i < count; i += 1) {
      values.push(Number(view.getFloat32(offset, true).toFixed(2)));
      offset += 4;
    }
    parts.push(letter + values.join(" "));
  }
  return parts.join("");
};

export const blobPaths = (blobs: Uint8Array[]): BlobPaths => {
  const cache = new Map<number, string>();
  return (index) => {
    const known = cache.get(index);
    if (known !== undefined) return known;
    const blob = blobs[index];
    if (!blob) return undefined;
    const d = pathFromBlob(blob);
    cache.set(index, d);
    return d;
  };
};

const paths = (raw: Rec, geometryKey: string, fill: Color | undefined, pathOf: BlobPaths): VectorPath[] => {
  if (!fill) return [];
  return recs(raw, geometryKey).flatMap((g): VectorPath[] => {
    const d = pathOf(num(g, "commandsBlob") ?? -1);
    if (d === undefined) return [];
    return [{ d, fill, rule: str(g, "windingRule") === "ODD" ? "evenodd" : "nonzero" }];
  });
};

export const vectorPaths = (raw: Rec, pathOf: BlobPaths): VectorPath[] => [
  ...paths(raw, "fillGeometry", firstSolid(raw, "fillPaints"), pathOf),
  ...paths(raw, "strokeGeometry", firstSolid(raw, "strokePaints"), pathOf),
];
