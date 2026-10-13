import { str } from "../../packages/fig-import/src/fig/guards";
import type { FigNode } from "../../packages/fig-import/src/tree/node-index";
import { figIndex } from "./fig-index";
import { screenFrames } from "./screen-frames";

const { byKey } = figIndex();
const count = (node: FigNode, type: string): number =>
  node.children.reduce((sum, child) => sum + count(child, type), node.type === type ? 1 : 0);
const visible = (node: FigNode): boolean => node.raw.visible !== false;
let missing = 0;
for (const id of process.argv.slice(2)) {
  const section = byKey.get(id);
  if (!section) {
    missing++;
    console.log(`${id}: not found`);
    continue;
  }
  for (const screen of screenFrames(section, visible))
    console.log(`${id}\t${screen.key}\t${count(screen, "INSTANCE")}\t${str(screen.raw, "name") ?? screen.key}`);
}
process.exit(missing === 0 ? 0 : 1);
