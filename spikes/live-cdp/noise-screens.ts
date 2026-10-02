import { num, rec, str, type Rec } from "../../packages/fig-import/src/fig/guards";
import { isFlex } from "../../packages/fig-import/src/convert/layout";
import { SERVICE_PAGES } from "../../packages/fig-import/src/import-document";
import { parentKey, type FigNode } from "../../packages/fig-import/src/tree/node-index";
import { pagesOf } from "../../packages/fig-import/src/tree/pages";
import { walkFig } from "./fig-walk";
import { turnKind } from "./turn-kind";

type Hits = { noise: number; stretch: number; grow: number; samples: string[] };
type Hit = { raw: Rec; label: string; owner: FigNode };
const hits: Hit[] = [];

const { index } = walkFig((raw, parent, label, owner) => {
  if (!parent || !isFlex(parent) || str(raw, "stackPositioning") === "ABSOLUTE") return;
  if (turnKind(rec(raw, "transform")) === "noise") hits.push({ raw, label, owner });
});

const canvases = [...index.byKey.values()].filter((n) => n.type === "CANVAS");
const screenPage = new Map(pagesOf(canvases, SERVICE_PAGES).flatMap((page) => page.screens.map((s) => [s.id, page.name])));
const screenOf = (node: FigNode | undefined): FigNode | undefined =>
  !node || screenPage.has(node.key) ? node : screenOf(index.byKey.get(parentKey(node.raw)));

const byScreen = new Map<string, Hits>();
for (const { raw, label, owner } of hits) {
  const screen = screenOf(owner);
  if (!screen) continue;
  const h = byScreen.get(screen.key) ?? { noise: 0, stretch: 0, grow: 0, samples: [] };
  byScreen.set(screen.key, h);
  h.noise++;
  const stretch = str(raw, "stackChildAlignSelf") === "STRETCH";
  const grow = (num(raw, "stackChildPrimaryGrow") ?? 0) > 0;
  if (stretch) h.stretch++;
  if (grow) h.grow++;
  if ((stretch || grow) && h.samples.length < 4) h.samples.push(`${label} «${str(raw, "name")}»${grow ? " grow" : ""}`);
}

const rows = [...byScreen].filter(([, h]) => h.stretch + h.grow > 0).sort(([, a], [, b]) => b.stretch + b.grow - (a.stretch + a.grow));
const total = rows.reduce((s, [, h]) => s + h.stretch + h.grow, 0);
console.log(`screens with noise: ${byScreen.size}, with noise stretch/grow: ${rows.length}, hits ${total}`);
for (const [key, h] of rows) {
  console.log(`${key} ${screenPage.get(key)} / ${str(index.byKey.get(key)?.raw, "name")}: noise ${h.noise}, stretch ${h.stretch}, grow ${h.grow}`);
  for (const s of h.samples) console.log(`  ${s}`);
}
