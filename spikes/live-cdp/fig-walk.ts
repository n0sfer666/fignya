import type { Rec } from "../../packages/fig-import/src/fig/guards";
import { innerFieldsOf } from "../../packages/fig-import/src/convert/inner-fields";
import { instanceResolver } from "../../packages/fig-import/src/convert/instance-resolver-cache";
import { mergedFields } from "../../packages/fig-import/src/convert/instance-resolver";
import { settledRaw } from "../../packages/fig-import/src/convert/swap-rebase";
import { parentKey, type FigNode, type NodeIndex } from "../../packages/fig-import/src/tree/node-index";
import { symbolNodes } from "../../packages/fig-import/src/tree/symbol-nodes";
import { figIndex } from "./fig-index";

export type Visit = (raw: Rec, parent: Rec | undefined, label: string, owner: FigNode, via: "raw" | "override") => void;
export type Walked = { index: NodeIndex; instances: number; targets: number; unresolved: number };

export const walkFig = (visit: Visit): Walked => {
  const index = figIndex();
  const symbols = symbolNodes(index.byKey.values());
  const resolve = instanceResolver(symbols);
  const innerFields = innerFieldsOf(symbols, resolve);
  const nodes = [...index.byKey.values()];
  for (const node of nodes) visit(node.raw, index.byKey.get(parentKey(node.raw))?.raw, node.key, node, "raw");
  const instances = nodes.filter((n) => n.type === "INSTANCE");
  let targets = 0;
  let unresolved = 0;
  for (const instance of instances) {
    const resolved = resolve(instance);
    unresolved += resolved.unresolved;
    for (const target of resolved.targets.values()) {
      const node = symbols.get(target.ids[target.ids.length - 1] ?? "");
      if (!node) continue;
      targets++;
      const settled = settledRaw(symbols, node, { ...innerFields(target.ids), ...mergedFields(target) });
      visit(settled, symbols.get(parentKey(node.raw))?.raw, `${instance.key} → ${node.key}`, instance, "override");
    }
  }
  return { index, instances: instances.length, targets, unresolved };
};
