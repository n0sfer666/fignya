import { contentOf, type Box, type NodeId, type Screen } from "@fignya/model";
import type { LoadedDocument } from "./load-document";
import type { ThumbRenderer } from "./thumb-renderer";

export type ShotRequest = { screenId: NodeId; address?: NodeId[] };

export type Shot = { png: Uint8Array; width: number; height: number };

export const SHOT_EDGE = 1568;

const MAX_SHOT_SCALE = 2;

const SHOT_TIMEOUT_MS = 15000;

const MIN_SHOT_SIZE = 1;

export const shotGeometry = (box: Box): { scale: number; width: number; height: number } => {
  const scale = Math.min(MAX_SHOT_SCALE, SHOT_EDGE / Math.max(box.width, box.height, 1));
  const edge = (size: number): number => Math.min(SHOT_EDGE, Math.max(1, Math.ceil(size * scale)));
  return { scale, width: edge(box.width), height: edge(box.height) };
};

export const takeShot = async (doc: Pick<LoadedDocument, "screen">, screen: Screen, address: NodeId[] | undefined, renderer: Pick<ThumbRenderer, "measure" | "draw">): Promise<Shot> => {
  const model = await doc.screen(screen.id);
  if (!model) throw new Error("no screen with this id");
  const content = contentOf(screen);
  const box = address ? await renderer.measure({ model, scale: 1, origin: content, measure: address }, SHOT_TIMEOUT_MS) : content;
  if (!box) throw new Error("the node is not rendered on this screen");
  if (box.width < MIN_SHOT_SIZE || box.height < MIN_SHOT_SIZE) throw new Error("the node is not visible or has zero size");
  const { scale, width, height } = shotGeometry(box);
  const image = await renderer.draw({ model, scale, origin: { x: box.x, y: box.y } }, width, height, SHOT_TIMEOUT_MS);
  return { png: image.toPNG(), width, height };
};
