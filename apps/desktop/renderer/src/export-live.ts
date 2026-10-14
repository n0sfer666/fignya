import type { Screen } from "@fignya/model";
import { exportScreen, screenImages } from "@fignya/render-dom";
import { exportImagePath } from "../../shared/export";

export const exportLive = async (screen: Screen): Promise<void> => {
  const model = await window.fignya.screen(screen.id);
  if (!model) throw new Error(`screen ${screen.id} is not loaded`);
  const files = await window.fignya.exportImages(screenImages(model));
  const { html, css, families } = exportScreen(model, { title: screen.name, imageUrl: (hash) => exportImagePath(files[hash] ?? hash) });
  await window.fignya.exportScreen({ screenId: screen.id, html, css, images: Object.keys(files), families });
};
