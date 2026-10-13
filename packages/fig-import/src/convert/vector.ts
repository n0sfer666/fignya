import type { Color, ImageFill, VectorPath } from "@fignya/model";
import { num, rec, recs, str, type Rec } from "../fig/guards";
import { firstSolid, paintsOf } from "./paint";

export const VECTOR_TYPES: ReadonlySet<string> = new Set(["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE", "REGULAR_POLYGON"]);

const FULL_TURN = 2 * Math.PI;

const isArc = (raw: Rec): boolean => {
  const arc = rec(raw, "arcData");
  if (!arc) return false;
  const sweep = Math.abs((num(arc, "endingAngle") ?? FULL_TURN) - (num(arc, "startingAngle") ?? 0));
  return (num(arc, "innerRadius") ?? 0) > 0 || sweep < FULL_TURN - 1e-3;
};

export const isVectorNode = (type: string, raw: Rec): boolean => VECTOR_TYPES.has(type) || (type === "ELLIPSE" && isArc(raw));

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

const topImage = (raw: Rec, key: string): ImageFill | undefined => {
  const [top] = paintsOf(raw, key);
  return top?.kind === "image" ? { hash: top.hash, fit: top.fit } : undefined;
};

const paths = (raw: Rec, geometryKey: string, fill: Color | ImageFill | undefined, pathOf: BlobPaths): VectorPath[] => {
  if (!fill) return [];
  return recs(raw, geometryKey).flatMap((g): VectorPath[] => {
    const d = pathOf(num(g, "commandsBlob") ?? -1);
    if (d === undefined) return [];
    return [{ d, fill, rule: str(g, "windingRule") === "ODD" ? "evenodd" : "nonzero" }];
  });
};

const fillLayers = (raw: Rec): (Color | ImageFill | undefined)[] => {
  const solid = firstSolid(raw, "fillPaints");
  const image = topImage(raw, "fillPaints");
  return image ? [solid, image] : [solid];
};

export const vectorPaths = (raw: Rec, pathOf: BlobPaths): VectorPath[] => [
  ...fillLayers(raw).flatMap((fill) => paths(raw, "fillGeometry", fill, pathOf)),
  ...paths(raw, "strokeGeometry", firstSolid(raw, "strokePaints"), pathOf),
];
