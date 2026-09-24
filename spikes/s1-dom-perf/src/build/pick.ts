import type { Screen } from "../tree/screens";

export type Scored = { screen: Screen; nodes: number };

export const byPercentile = (scored: Scored[], p: number): Scored => {
  const sorted = [...scored].sort((a, b) => a.nodes - b.nodes);
  const picked = sorted[Math.round((sorted.length - 1) * p)];
  if (!picked) throw new Error("no screens to pick from");
  return picked;
};

export const screenId = (screen: Screen): string => screen.node.key.replace(":", "-");

export const busiestPage = (scored: Scored[]): string => {
  const counts = new Map<string, number>();
  for (const { screen } of scored) counts.set(screen.page, (counts.get(screen.page) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
};
