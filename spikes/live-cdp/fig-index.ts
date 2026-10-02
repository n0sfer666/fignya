import { readFileSync } from "node:fs";
import { readArchive } from "../../packages/fig-import/src/fig/read-archive";
import { readMessage } from "../../packages/fig-import/src/fig/read-message";
import type { Rec } from "../../packages/fig-import/src/fig/guards";
import { buildIndex, type NodeIndex } from "../../packages/fig-import/src/tree/node-index";
import { preparedNodes } from "../../packages/fig-import/src/tree/prepared-nodes";

export const figIndex = (): NodeIndex => {
  const path = process.env.FIG_FILE;
  if (!path) throw new Error("FIG_FILE is not set");
  const nodes: Rec[] = [];
  const reader = readMessage(readArchive(new Uint8Array(readFileSync(path))).canvas);
  for (let step = reader.next(); !step.done; step = reader.next()) nodes.push(step.value.node);
  return buildIndex(preparedNodes(nodes).nodes, []);
};
