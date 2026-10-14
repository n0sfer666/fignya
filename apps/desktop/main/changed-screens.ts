import type { EditChange, NodeId } from "@fignya/model";

export const byScreen = (changes: readonly EditChange[]): Map<NodeId, NodeId[][]> => {
  const screens = new Map<NodeId, NodeId[][]>();
  for (const { screenId, target } of changes) screens.set(screenId, [...(screens.get(screenId) ?? []), target]);
  return screens;
};
