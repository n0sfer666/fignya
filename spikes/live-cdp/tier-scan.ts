import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { bitmap } from "./bitmap";

const [dir = ""] = process.argv.slice(2);
const out = join(import.meta.dir, "out", "tier-scan");
mkdirSync(out, { recursive: true });
const STEP = 8;

const diff = (base: string, sharp: string): number => {
  const a = bitmap(base);
  const small = join(out, "small.png");
  const r = Bun.spawnSync(["sips", "-z", String(a.height), String(a.width), sharp, "--out", small]);
  if (r.exitCode !== 0) throw new Error(`sips: ${r.stderr.toString()}`);
  const b = bitmap(small);
  let sum = 0;
  let count = 0;
  for (let y = 0; y < a.height; y += STEP)
    for (let x = 0; x < a.width; x += STEP) {
      const pa = a.pixel(x, y);
      const pb = b.pixel(x, y);
      sum += Math.abs((pa[0] ?? 0) - (pb[0] ?? 0)) + Math.abs((pa[1] ?? 0) - (pb[1] ?? 0)) + Math.abs((pa[2] ?? 0) - (pb[2] ?? 0));
      count++;
    }
  return sum / count / 3;
};

const files = new Set(readdirSync(dir));
for (const name of [...files].filter((f) => f.endsWith("@2x.png") || f.endsWith("@1x.png")).sort()) {
  const base = name.replace(/@[12]x\.png$/, "@1x.png");
  const reference = name.endsWith("@2x.png") && files.has(base) ? base : name.replace(/@[12]x\.png$/, ".png");
  if (!files.has(reference) || reference === name) continue;
  console.log(`${diff(join(dir, reference), join(dir, name)).toFixed(1).padStart(6)} ${name} vs ${reference}`);
}
