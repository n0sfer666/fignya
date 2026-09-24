import type { ScreenModel } from "@fignya/model";
import { renderScreen } from "@fignya/render-dom";
import type { ThumbJob } from "../../shared/api";
import { imageUrl } from "../../shared/urls";

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

const imageHashes = (model: ScreenModel): string[] => [
  ...new Set([...model.nodes.values()].flatMap((n) => (n.style.background ?? []).flatMap((p) => (p.kind === "image" ? [p.hash] : [])))),
];

const decodeImage = (hash: string): Promise<void> => {
  const img = new Image();
  img.src = imageUrl(hash);
  return img.decode().catch(() => undefined);
};

const render = async (job: ThumbJob): Promise<void> => {
  const stage = document.createElement("div");
  stage.style.cssText = `transform:scale(${job.scale});transform-origin:0 0`;
  stage.append(renderScreen(job.model, { imageUrl }));
  document.body.replaceChildren(stage);
  await Promise.all([document.fonts.ready, ...imageHashes(job.model).map(decodeImage)]);
  await nextFrame();
  await nextFrame();
};

window.fignya.onThumbJob((job) => {
  render(job)
    .catch((error: unknown) => console.error(`fignya: thumbnail render failed: ${String(error)}`))
    .finally(() => window.fignya.thumbRendered(job.id));
});
