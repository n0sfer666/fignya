import { existsSync, readdirSync, readFileSync } from "node:fs";
import { bitmap } from "./bitmap";
import { isRec } from "./cdp";

const [a, b] = process.argv.slice(2);
if (!a || !b) throw new Error("usage: shots-diff.ts <tag a> <tag b>");
const out = `${import.meta.dir}/out`;
const dirOf = (tag: string): string => `${out}/shots-${tag}`;

type Rects = Map<string, string>;
const rectsOf = (file: string): Rects => {
  if (!existsSync(file)) return new Map();
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  const rects = isRec(parsed) ? parsed.rects : undefined;
  if (!isRec(rects)) throw new Error(`${file}: no rects`);
  return new Map(Object.entries(rects).map(([k, v]) => [k, JSON.stringify(v)]));
};

type PixelDiff = { pixels: number; maxDelta: number; box: string };
const pixelDiff = (fa: string, fb: string): PixelDiff | string => {
  const pa = bitmap(fa);
  const pb = bitmap(fb);
  if (pa.width !== pb.width || pa.height !== pb.height) return `size ${pa.width}x${pa.height} vs ${pb.width}x${pb.height}`;
  let pixels = 0;
  let maxDelta = 0;
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let y = 0; y < pa.height; y++) {
    for (let x = 0; x < pa.width; x++) {
      const ca = pa.pixel(x, y);
      const cb = pb.pixel(x, y);
      const d = Math.max(...ca.map((v, c) => Math.abs(v - (cb[c] ?? 0))));
      if (d === 0) continue;
      pixels++;
      maxDelta = Math.max(maxDelta, d);
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
  }
  return { pixels, maxDelta, box: pixels > 0 ? `${x0},${y0},${x1},${y1}` : "" };
};

const idsOf = (tag: string): string[] => readdirSync(dirOf(tag)).filter((f) => f.endsWith(".png")).map((f) => f.replace(".png", ""));
let differs = 0;
for (const id of [...new Set([...idsOf(a), ...idsOf(b)])].sort()) {
  const missing = [a, b].filter((tag) => !existsSync(`${dirOf(tag)}/${id}.png`));
  if (missing.length > 0) {
    differs++;
    console.log(`${id}: missing in ${missing.join(", ")}`);
    continue;
  }
  const ra = rectsOf(`${dirOf(a)}/${id}.json`);
  const rb = rectsOf(`${dirOf(b)}/${id}.json`);
  const moved = [...new Set([...ra.keys(), ...rb.keys()])].filter((k) => ra.get(k) !== rb.get(k));
  const px = pixelDiff(`${dirOf(a)}/${id}.png`, `${dirOf(b)}/${id}.png`);
  const pixelText = typeof px === "string" ? px : `pixels ${px.pixels}, max delta ${px.maxDelta}${px.box ? `, box ${px.box}` : ""}`;
  if (moved.length > 0 || typeof px === "string" || px.pixels > 0) differs++;
  console.log(`${id}: rects moved ${moved.length}, ${pixelText}`);
  for (const k of moved.slice(0, 6)) console.log(`  ${k}: ${ra.get(k) ?? "-"} → ${rb.get(k) ?? "-"}`);
}
console.log(`screens differing: ${differs}`);
