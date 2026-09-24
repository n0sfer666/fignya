import { bool, bytes, num, rec, recs, str, type Rec } from "../fig/guards";

export type ImageUrl = (hash: string) => string;

export const rgba = (color: Rec | undefined, opacity = 1): string => {
  const c = (k: string): number => Math.round((num(color, k) ?? 0) * 255);
  const a = (num(color, "a") ?? 1) * opacity;
  return `rgba(${c("r")},${c("g")},${c("b")},${Number(a.toFixed(3))})`;
};

export const visiblePaints = (raw: Rec, key: string): Rec[] =>
  recs(raw, key).filter((p) => bool(p, "visible") !== false && (num(p, "opacity") ?? 1) > 0);

export const hashHex = (hash: Uint8Array): string => Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");

const gradient = (paint: Rec): string => {
  const opacity = num(paint, "opacity") ?? 1;
  const stops = recs(paint, "stops")
    .map((s) => `${rgba(rec(s, "color"), opacity)} ${Math.round((num(s, "position") ?? 0) * 100)}%`)
    .join(",");
  if (str(paint, "type") !== "GRADIENT_LINEAR") return `radial-gradient(${stops})`;
  const t = rec(paint, "transform");
  const angle = (Math.atan2(num(t, "m10") ?? 0, num(t, "m00") ?? 1) * 180) / Math.PI + 90;
  return `linear-gradient(${Math.round(angle)}deg,${stops})`;
};

const SCALE_MODE: Record<string, string> = { FILL: "cover", FIT: "contain", TILE: "auto", STRETCH: "100% 100%" };

type Layer = { image: string; size: string };

const layer = (paint: Rec, imageUrl: ImageUrl): Layer | undefined => {
  const type = str(paint, "type");
  if (type === "SOLID") {
    const c = rgba(rec(paint, "color"), num(paint, "opacity") ?? 1);
    return { image: `linear-gradient(${c},${c})`, size: "100% 100%" };
  }
  if (type?.startsWith("GRADIENT_")) return { image: gradient(paint), size: "100% 100%" };
  const hash = bytes(rec(paint, "image"), "hash");
  if (type !== "IMAGE" || !hash) return undefined;
  return { image: `url(${imageUrl(hashHex(hash))})`, size: SCALE_MODE[str(paint, "imageScaleMode") ?? "FILL"] ?? "cover" };
};

export const backgroundCss = (raw: Rec, imageUrl: ImageUrl): string[] => {
  const paints = visiblePaints(raw, "fillPaints");
  const [only] = paints;
  if (paints.length === 1 && only && str(only, "type") === "SOLID") {
    return [`background-color:${rgba(rec(only, "color"), num(only, "opacity") ?? 1)}`];
  }
  const layers = paints.map((p) => layer(p, imageUrl)).filter((l): l is Layer => l !== undefined).reverse();
  if (layers.length === 0) return [];
  return [
    `background-image:${layers.map((l) => l.image).join(",")}`,
    `background-size:${layers.map((l) => l.size).join(",")}`,
    "background-position:center",
    "background-repeat:no-repeat",
  ];
};

export const firstSolid = (raw: Rec, key: string): string | undefined => {
  const paint = visiblePaints(raw, key).find((p) => str(p, "type") === "SOLID");
  return paint ? rgba(rec(paint, "color"), num(paint, "opacity") ?? 1) : undefined;
};
