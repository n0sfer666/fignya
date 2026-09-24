import { num, recs, str, type Rec } from "../fig/guards";
import type { SvgPath } from "./el";
import { firstSolid } from "./paint";

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
    const values: number[] = [];
    for (let i = 0; i < count; i += 1) {
      values.push(Number(view.getFloat32(offset, true).toFixed(2)));
      offset += 4;
    }
    parts.push(letter + values.join(" "));
  }
  return parts.join("");
};

const paths = (raw: Rec, geometryKey: string, fill: string | undefined, blobs: Uint8Array[]): SvgPath[] => {
  if (!fill) return [];
  return recs(raw, geometryKey).flatMap((g) => {
    const blob = blobs[num(g, "commandsBlob") ?? -1];
    if (!blob) return [];
    const rule = str(g, "windingRule") === "ODD" ? "evenodd" : "nonzero";
    return [{ d: pathFromBlob(blob), fill, rule }];
  });
};

export const vectorPaths = (raw: Rec, blobs: Uint8Array[]): SvgPath[] => [
  ...paths(raw, "fillGeometry", firstSolid(raw, "fillPaints"), blobs),
  ...paths(raw, "strokeGeometry", firstSolid(raw, "strokePaints"), blobs),
];
