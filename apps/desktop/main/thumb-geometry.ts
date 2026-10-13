import { contentOf, type Box, type Screen } from "@fignya/model";
import { thumbScale } from "./thumb-scale";

export type ThumbGeometry = { scale: number; origin: Pick<Box, "x" | "y">; width: number; height: number };

export const thumbGeometry = (screen: Screen, tier: number): ThumbGeometry => {
  const box = contentOf(screen);
  const scale = thumbScale(box.width, box.height, tier);
  return { scale, origin: { x: box.x, y: box.y }, width: Math.max(1, Math.ceil(box.width * scale)), height: Math.max(1, Math.ceil(box.height * scale)) };
};
