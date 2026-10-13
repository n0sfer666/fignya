import type { ScreenModel } from "@fignya/model";
import { renderRoot } from "./render-node";

export const screenImages = (model: ScreenModel): string[] => {
  const used = new Set<string>();
  renderRoot({ nodes: model.nodes, imageUrl: (hash) => (used.add(hash), "") }, model.rootId);
  return [...used];
};
