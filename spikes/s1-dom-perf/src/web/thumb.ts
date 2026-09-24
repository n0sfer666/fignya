import { nextFrame, waitImages } from "./images";
import { renderEl } from "./render";
import { readScene, worldElement } from "./scene";
import { applyView } from "./viewport";

const run = async (): Promise<void> => {
  const scene = readScene();
  const world = worldElement();
  world.style.width = `${scene.width}px`;
  world.style.height = `${scene.height}px`;
  world.append(renderEl(scene.root));
  applyView(world, { x: 0, y: 0, s: scene.scale });
  await document.fonts.ready;
  await waitImages(world);
  await nextFrame();
  await nextFrame();
  await fetch(`/__ready?id=${scene.id}`);
};

run().catch((error: unknown) => fetch(`/__ready?id=error&e=${encodeURIComponent(String(error))}`));
