import type { Color } from "@fignya/model";
import { num, type Rec } from "../fig/guards";

const channel = (color: Rec | undefined, key: string): number => Math.round((num(color, key) ?? 0) * 255);

export const colorOf = (color: Rec | undefined, opacity = 1): Color => ({
  r: channel(color, "r"),
  g: channel(color, "g"),
  b: channel(color, "b"),
  a: Number(((num(color, "a") ?? 1) * opacity).toFixed(3)),
});
