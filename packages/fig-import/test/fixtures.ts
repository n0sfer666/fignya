import type { Rec } from "../src/fig/guards";

export const guid = (localID: number): Rec => ({ sessionID: 1, localID });

export type FigSpec = Rec & { id: number; parent?: number; position?: string; type: string };

export const figNode = ({ id, parent, position, ...rest }: FigSpec): Rec => ({
  guid: guid(id),
  ...(parent === undefined ? {} : { parentIndex: { guid: guid(parent), position: position ?? "a" } }),
  ...rest,
});

export const figMessage = (specs: FigSpec[], blobs: Uint8Array[] = []): Rec => ({
  nodeChanges: specs.map(figNode),
  blobs: blobs.map((bytes) => ({ bytes })),
});

export const solid = (r: number, g: number, b: number, extra: Rec = {}): Rec => ({
  type: "SOLID",
  color: { r, g, b, a: 1 },
  ...extra,
});

export const box = (x: number, y: number, w: number, h: number): Rec => ({
  transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
  size: { x: w, y: h },
});
