import { animate } from "./frames";
import { nextFrame, waitImages } from "./images";
import { renderEl, renderThumbs } from "./render";
import { readScene, worldElement } from "./scene";
import { applyView, fitView, panAt, zoomAt } from "./viewport";

const PHASE_MS = 3000;

const report = async (result: object): Promise<void> => {
  await fetch(`/__report?r=${encodeURIComponent(JSON.stringify(result))}`);
};

const run = async (): Promise<void> => {
  const willChange = new URLSearchParams(location.search).get("wc") === "1";
  const world = worldElement();
  const vw = innerWidth;
  const vh = innerHeight;
  const t0 = performance.now();
  const scene = readScene();
  const overview = scene.kind === "overview";
  world.style.width = `${scene.width}px`;
  world.style.height = `${scene.height}px`;
  world.append(overview ? renderThumbs(scene.thumbs) : renderEl(scene.root));
  const fit = fitView(scene.width, scene.height, vw, vh);
  const base = overview ? Math.min(1, fit.s * 4) : 1;
  applyView(world, { x: 0, y: 0, s: base });
  await nextFrame();
  await nextFrame();
  const firstFrameMs = performance.now() - t0;
  const sinceNavigationMs = performance.now();
  const images = await waitImages(world);
  const imagesMs = performance.now() - t0;
  const idle = await animate(1000, 0, () => undefined);
  if (willChange) world.style.willChange = "transform";
  const pan = await animate(PHASE_MS, idle.p50, (t) => applyView(world, panAt(t, base, scene.width, scene.height, vw, vh)));
  const zoomBase = overview ? fit.s : base;
  const cx = scene.width / 2;
  const cy = overview ? scene.height / 2 : Math.min(scene.height / 2, vh / 2);
  const zoom = await animate(PHASE_MS, idle.p50, (t) => applyView(world, zoomAt(t, zoomBase, vw, vh, cx, cy)));
  await report({
    scenario: scene.id,
    willChange,
    userAgent: navigator.userAgent,
    dpr: devicePixelRatio,
    viewport: [vw, vh],
    dom: world.getElementsByTagName("*").length,
    images,
    firstFrameMs: Math.round(firstFrameMs),
    sinceNavigationMs: Math.round(sinceNavigationMs),
    imagesMs: Math.round(imagesMs),
    refreshMs: idle.p50,
    pan,
    zoom,
  });
};

run().catch((error: unknown) => report({ error: String(error) }));
