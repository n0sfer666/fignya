import { clipsContent } from "../../packages/fig-import/src/fig/clips-content";
import { num, rec } from "../../packages/fig-import/src/fig/guards";
import { contentBounds, shown } from "../../packages/fig-import/src/tree/content-bounds";
import type { FigNode } from "../../packages/fig-import/src/tree/node-index";
import { childrenOf } from "../../packages/fig-import/src/tree/placements";
import { figIndex } from "./fig-index";
import { screenFrames } from "./screen-frames";

const { root } = figIndex();

const openInstances = (node: FigNode): number =>
  childrenOf(node)
    .filter((c) => shown(c) && !clipsContent(c.raw, c.type))
    .reduce((n, c) => n + Number(c.type === "INSTANCE") + openInstances(c), 0);


let total = 0;
let over = 0;
for (const page of root.children) {
  for (const screen of screenFrames(page, shown)) {
    total++;
    if (clipsContent(screen.raw, screen.type)) continue;
    const size = rec(screen.raw, "size");
    const w = num(size, "x") ?? 0;
    const h = num(size, "y") ?? 0;
    const box = contentBounds(screen) ?? { x: 0, y: 0, width: w, height: h };
    const instances = openInstances(screen);
    const out = [-box.x, -box.y, box.x + box.width - w, box.y + box.height - h].map((v) => Math.round(v));
    if (out.every((v) => v <= 0) && instances === 0) continue;
    over++;
    console.log(`${screen.key} «${String(screen.raw.name)}» ${w}×${h} left/top/right/bottom=${out.join("/")} openInstances=${instances}`);
  }
}
console.log(`screens ${total}, non-clipping with overflow or open instances ${over}`);
