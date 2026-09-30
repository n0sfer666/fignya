import type { DesignDocument } from "@fignya/model";

export type Settled = { overrides: number; failed: number };

const overridesOf = (node: { readonly overrides: readonly unknown[] }): number | undefined => {
  try {
    return node.overrides.length;
  } catch {
    return undefined;
  }
};

export function* settleOverrides(document: DesignDocument): Generator<number, Settled> {
  const settled: Settled = { overrides: 0, failed: 0 };
  for (const node of document.nodes.values()) {
    if (node.kind !== "instance") continue;
    const count = overridesOf(node);
    if (count === undefined) settled.failed += 1;
    else settled.overrides += count;
    yield settled.overrides;
  }
  return settled;
}
