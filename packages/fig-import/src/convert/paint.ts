import type { Color, ColorStop, ImageFit, Paint } from "@fignya/model";
import { bool, bytes, num, rec, recs, str, type Rec } from "../fig/guards";
import { colorOf } from "./color";

const SCALE_MODE: Record<string, ImageFit> = { FILL: "cover", FIT: "contain", TILE: "tile", STRETCH: "stretch" };

const MIN_STOPS = 2;

export const visiblePaints = (raw: Rec, key: string): Rec[] =>
  recs(raw, key).filter((p) => bool(p, "visible") !== false && (num(p, "opacity") ?? 1) > 0);

export const hashHex = (hash: Uint8Array): string => Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");

const opacityOf = (paint: Rec): number => num(paint, "opacity") ?? 1;

const stopsOf = (paint: Rec): ColorStop[] =>
  recs(paint, "stops").map((s) => ({ color: colorOf(rec(s, "color"), opacityOf(paint)), position: num(s, "position") ?? 0 }));

const angleOf = (paint: Rec): number => {
  const t = rec(paint, "transform");
  return Math.round((Math.atan2(num(t, "m10") ?? 0, num(t, "m00") ?? 1) * 180) / Math.PI + 90);
};

const paintOf = (paint: Rec): Paint | undefined => {
  const type = str(paint, "type");
  if (type?.startsWith("GRADIENT_") && recs(paint, "stops").length < MIN_STOPS) return undefined;
  if (type === "SOLID") return { kind: "solid", color: colorOf(rec(paint, "color"), opacityOf(paint)) };
  if (type === "GRADIENT_LINEAR") return { kind: "linear", angle: angleOf(paint), stops: stopsOf(paint) };
  if (type?.startsWith("GRADIENT_")) return { kind: "radial", stops: stopsOf(paint) };
  const hash = bytes(rec(paint, "image"), "hash");
  if (type !== "IMAGE" || !hash) return undefined;
  return { kind: "image", hash: hashHex(hash), fit: SCALE_MODE[str(paint, "imageScaleMode") ?? "FILL"] ?? "cover" };
};

export const paintsOf = (raw: Rec, key: string): Paint[] =>
  visiblePaints(raw, key)
    .map(paintOf)
    .filter((p): p is Paint => p !== undefined)
    .reverse();

export const firstSolid = (raw: Rec, key: string): Color | undefined => {
  const paint = visiblePaints(raw, key).find((p) => str(p, "type") === "SOLID");
  return paint ? colorOf(rec(paint, "color"), opacityOf(paint)) : undefined;
};
