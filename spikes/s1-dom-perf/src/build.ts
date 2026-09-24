import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { decodeCanvas } from "./fig/decode-canvas";
import { readArchive } from "./fig/read-archive";
import { buildIndex } from "./tree/node-index";
import { pages, pageScreens } from "./tree/screens";
import { convertScreen, countEls, type ConvertContext } from "./convert/convert-node";
import { imageStore } from "./build/images";
import { pageHtml } from "./build/html";
import { busiestPage, byPercentile, screenId, type Scored } from "./build/pick";

const figFile = process.env.FIG_FILE;
if (!figFile) throw new Error("FIG_FILE env is required");
const dist = join(import.meta.dir, "..", "dist");
const THUMB_SCALE = 0.25;
const PERCENTILES: [string, number][] = [["p50", 0.5], ["p99", 0.99], ["max", 1]];

const started = performance.now();
const archive = await readArchive(figFile);
const index = buildIndex(decodeCanvas(archive.canvas));
const decodedMs = performance.now() - started;
const images = imageStore(archive.images);
const ctx: ConvertContext = { index, imageUrl: images.url };

const scored: Scored[] = pages(index.root, new Set(["Internal Only Canvas"])).flatMap((page) =>
  pageScreens(page).map((screen) => {
    const el = convertScreen(ctx, screen.node);
    return { screen, nodes: el ? countEls(el) : 0 };
  }),
);

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "thumb-src"), { recursive: true });

const summary: Record<string, unknown> = { decodedMs: Math.round(decodedMs), screens: scored.length };
for (const [name, p] of PERCENTILES) {
  const { screen, nodes } = byPercentile(scored, p);
  const root = convertScreen(ctx, screen.node);
  const scene = { kind: "screen", id: name, width: screen.width, height: screen.height, root };
  await Bun.write(join(dist, `screen-${name}.html`), pageHtml(scene, "bench.js"));
  summary[`screen-${name}`] = { nodes, width: screen.width, height: screen.height };
}

const overviewPage = busiestPage(scored);
const onPage = scored.filter((s) => s.screen.page === overviewPage).map((s) => s.screen);
const minX = Math.min(...onPage.map((s) => s.x));
const minY = Math.min(...onPage.map((s) => s.y));
const thumbs = onPage.map((s) => ({ src: `thumbs/${screenId(s)}.png`, x: s.x - minX, y: s.y - minY, w: s.width, h: s.height }));
for (const s of onPage) {
  const scene = { kind: "thumb", id: screenId(s), width: s.width, height: s.height, scale: THUMB_SCALE, root: convertScreen(ctx, s.node) };
  await Bun.write(join(dist, "thumb-src", `${screenId(s)}.html`), pageHtml(scene, "thumb.js", "../"));
}
const width = Math.max(...thumbs.map((t) => t.x + t.w));
const height = Math.max(...thumbs.map((t) => t.y + t.h));
await Bun.write(join(dist, "overview.html"), pageHtml({ kind: "overview", id: "overview", width, height, thumbs }, "bench.js"));
await Bun.write(join(dist, "thumbs.json"), JSON.stringify(thumbs.map((t) => ({ ...t, id: t.src.slice(7, -4) }))));
summary.overview = { screens: thumbs.length, nodes: scored.filter((s) => s.screen.page === overviewPage).reduce((a, s) => a + s.nodes, 0) };
summary.images = await images.write(dist);

const web = await Bun.build({ entrypoints: ["src/web/bench.ts", "src/web/thumb.ts"], outdir: dist, target: "browser", minify: true });
if (!web.success) throw new Error(web.logs.join("\n"));
await Bun.write(join(dist, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2), `\nbuild ${Math.round(performance.now() - started)} ms`);
