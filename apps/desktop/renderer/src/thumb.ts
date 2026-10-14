import type { Box } from "@fignya/model";
import { renderScreen } from "@fignya/render-dom";
import type { ThumbJob } from "../../shared/api";
import { imageUrl } from "../../shared/urls";
import { findEditTarget } from "./canvas/edit-target";
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

const measured = (job: ThumbJob, host: HTMLElement): Box | undefined => {
  const el = job.measure && findEditTarget(host.shadowRoot ?? host, job.measure);
  if (!el) return undefined;
  const { left, top, width, height } = el.getBoundingClientRect();
  return { x: left / job.scale + job.origin.x, y: top / job.scale + job.origin.y, width: width / job.scale, height: height / job.scale };
};

const render = async (job: ThumbJob): Promise<Box | undefined> => {
  const stage = document.createElement("div");
  stage.style.cssText = `transform:scale(${job.scale}) translate(${-job.origin.x}px,${-job.origin.y}px);transform-origin:0 0`;
  const host = renderScreen(job.model, { imageUrl });
  stage.append(host);
  document.body.replaceChildren(stage);
  stage.getBoundingClientRect();
  await Promise.all([document.fonts.ready, ...imageHashes(job.model).map(decodeImage)]);
  await nextFrame();
  await nextFrame();
  return measured(job, host);
};

const faces = window.fignya.fontFaces().then(applyFaces, (error: unknown) => console.error(`fignya: thumbnail fonts: ${String(error)}`));

window.fignya.onFontFaces(applyFaces);

window.fignya.onThumbJob((job) => {
  faces
    .then(() => render(job))
    .then(
      (box) => window.fignya.thumbRendered(job.id, box),
      (error: unknown) => {
        console.error(`fignya: thumbnail render failed: ${String(error)}`);
        window.fignya.thumbRendered(job.id);
      },
    );
});
