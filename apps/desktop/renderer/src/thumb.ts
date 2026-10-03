import { renderScreen } from "@fignya/render-dom";
import type { ThumbJob } from "../../shared/api";
import { imageUrl } from "../../shared/urls";
import { applyFaces } from "./fonts/apply-faces";
import { imageHashes } from "./image-hashes";
import { redecoding } from "./redecoding";

const REDECODE_MS = 500;

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

const decodeImage = (hash: string): Promise<void> => {
  const img = new Image();
  img.src = imageUrl(hash);
  return redecoding(() => img.decode(), REDECODE_MS).catch(() => undefined);
};

const render = async (job: ThumbJob): Promise<void> => {
  const stage = document.createElement("div");
  stage.style.cssText = `transform:scale(${job.scale});transform-origin:0 0`;
  stage.append(renderScreen(job.model, { imageUrl }));
  document.body.replaceChildren(stage);
  stage.getBoundingClientRect();
  await Promise.all([document.fonts.ready, ...imageHashes(job.model).map(decodeImage)]);
  await nextFrame();
  await nextFrame();
};

const faces = window.fignya.fontFaces().then(applyFaces, (error: unknown) => console.error(`fignya: thumbnail fonts: ${String(error)}`));

window.fignya.onFontFaces(applyFaces);

window.fignya.onThumbJob((job) => {
  faces
    .then(() => render(job))
    .catch((error: unknown) => console.error(`fignya: thumbnail render failed: ${String(error)}`))
    .finally(() => window.fignya.thumbRendered(job.id));
});
