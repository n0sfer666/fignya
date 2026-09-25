import type { NodeId } from "@fignya/model";
import { componentKeys } from "../tree/component-keys";
import type { FigNode } from "../tree/node-index";
import { resolveInstance, type Resolved, type ResolveContext } from "./instance-resolver";

const UNRESOLVED: Resolved = { targets: new Map(), unresolved: 0, swapBelow: () => undefined };

export const instanceResolver = (byKey: ReadonlyMap<string, FigNode>): ((instance: FigNode) => Resolved) => {
  const cache = new Map<NodeId, Resolved>();
  const ctx: ResolveContext = {
    byKey,
    keysOf: componentKeys(byKey),
    resolve: (instance) => {
      const known = cache.get(instance.key);
      if (known) return known;
      cache.set(instance.key, UNRESOLVED);
      const resolved = resolveInstance(ctx, instance);
      cache.set(instance.key, resolved);
      return resolved;
    },
  };
  return ctx.resolve;
};
