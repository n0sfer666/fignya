import { pathKey, type NodeId } from "@fignya/model";
import type { Rec } from "../fig/guards";
import type { FigNode } from "../tree/node-index";
import { mergedFields, type Resolved } from "./instance-resolver";

export const innerFieldsOf =
  (byKey: ReadonlyMap<string, FigNode>, resolve: (instance: FigNode) => Resolved) =>
  (ids: readonly NodeId[]): Rec => {
    const fields: Rec = {};
    for (let depth = ids.length - 2; depth >= 0; depth--) {
      const inner = byKey.get(ids[depth] ?? "");
      const target = inner && resolve(inner).targets.get(pathKey(ids.slice(depth + 1)));
      if (target) Object.assign(fields, mergedFields(target));
    }
    return fields;
  };
