import { SERVICE_PAGES } from "../../packages/fig-import/src/import-document";
import { pagesOf } from "../../packages/fig-import/src/tree/pages";
import { boundsOf, MIN_ZOOM } from "../../apps/desktop/renderer/src/canvas/viewport";
import { figIndex } from "./fig-index";

const canvases = [...figIndex().byKey.values()].filter((n) => n.type === "CANVAS");
const rows = pagesOf(canvases, SERVICE_PAGES).flatMap((page) => {
  const bounds = boundsOf(page.screens);
  return bounds ? [{ name: page.name, screens: page.screens.length, width: bounds.width, height: bounds.height }] : [];
});
rows.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
for (const r of rows) {
  const atMin = `${Math.ceil(r.width * MIN_ZOOM)}×${Math.ceil(r.height * MIN_ZOOM)}`;
  console.log(`${r.name}: ${r.screens} screens, ${Math.round(r.width)}×${Math.round(r.height)} px, at zoom ${MIN_ZOOM}: ${atMin} px`);
}
