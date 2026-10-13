import type { Rec } from "../../packages/fig-import/src/fig/guards";
import { isFlip, rotation } from "../../packages/fig-import/src/convert/layout";

const NOISE = 1e-6;

export type Kind = "none" | "flip" | "noise" | "turn";

export const turnKind = (t: Rec | undefined): Kind => {
  const m = rotation(t);
  if (!m) return "none";
  if (isFlip(m)) return "flip";
  const near = (v: number, to: number): boolean => Math.abs(v - to) < NOISE;
  return near(m[0], 1) && near(m[1], 0) && near(m[2], 0) && near(m[3], 1) ? "noise" : "turn";
};
