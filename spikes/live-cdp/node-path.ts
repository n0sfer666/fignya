import { str } from "../../packages/fig-import/src/fig/guards";
import { parentKey, type FigNode } from "../../packages/fig-import/src/tree/node-index";
import { figIndex } from "./fig-index";

const { byKey } = figIndex();
const trail = (node: FigNode | undefined): string[] =>
  node ? [...trail(byKey.get(parentKey(node.raw))), `${node.type} «${str(node.raw, "name")}»`] : [];
let missing = 0;
for (const id of process.argv.slice(2)) {
  const node = byKey.get(id);
  if (!node) missing++;
  console.log(node ? `${id}: ${trail(node).slice(1).join(" / ")}` : `${id}: not found`);
}
process.exit(missing === 0 ? 0 : 1);
