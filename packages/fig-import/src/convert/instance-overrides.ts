import { pathKey, sameValue, type DesignNode, type NodeId, type Override } from "@fignya/model";
import type { Rec } from "../fig/guards";
import { parentKey, type FigNode } from "../tree/node-index";
import { convertNode, type ConvertContext } from "./convert-node";
import { instanceResolver } from "./instance-resolver-cache";
import { mergedFields, type Target } from "./instance-resolver";
import { overridePatch } from "./override-patch";
import { settledRaw, swappedTo } from "./swap-rebase";
import type { BlobPaths } from "./vector";

type Base = { fields: Rec; raw: Rec; node: DesignNode };

const changes = (raw: Rec, fields: Rec): boolean => {
  for (const key in fields) if (!sameValue(raw[key], fields[key])) return true;
  return false;
};

export const instanceOverrides = (byKey: ReadonlyMap<string, FigNode>, pathOf: BlobPaths): ((instance: FigNode) => Override[]) => {
  const resolve = instanceResolver(byKey);
  const plain: ConvertContext = { pathOf, overridesOf: () => [] };
  const convertRaw = (node: FigNode, raw: Rec): DesignNode =>
    convertNode({ ...node, raw }, { parent: byKey.get(parentKey(node.raw))?.raw ?? {}, children: [] }, plain);

  const innerFields = (ids: readonly NodeId[]): Rec => {
    const fields: Rec = {};
    for (let depth = ids.length - 2; depth >= 0; depth--) {
      const inner = byKey.get(ids[depth] ?? "");
      const target = inner && resolve(inner).targets.get(pathKey(ids.slice(depth + 1)));
      if (target) Object.assign(fields, mergedFields(target));
    }
    return fields;
  };

  const bases = new Map<string, Base>();
  const baseOf = (node: FigNode, ids: readonly NodeId[]): Base => {
    const key = pathKey(ids);
    const known = bases.get(key);
    if (known) return known;
    const fields = innerFields(ids);
    const raw = settledRaw(byKey, node, fields);
    const base = { fields, raw, node: convertRaw(node, raw) };
    bases.set(key, base);
    return base;
  };

  const overrideOf = (target: Target): Override | undefined => {
    const node = byKey.get(target.ids[target.ids.length - 1] ?? "");
    if (!node) return undefined;
    const base = baseOf(node, target.ids);
    const fields = mergedFields(target);
    if (!changes(base.raw, fields)) return undefined;
    const raw = settledRaw(byKey, node, { ...base.fields, ...fields });
    const to = swappedTo(raw);
    const swapped = to !== undefined && byKey.has(to) && to !== swappedTo(base.raw);
    const componentId = base.node.kind === "instance" && swapped ? to : undefined;
    return overridePatch(target.ids, base.node, convertRaw(node, raw), componentId);
  };

  return (instance) =>
    [...resolve(instance).targets.values()].flatMap((target) => {
      const override = overrideOf(target);
      return override ? [override] : [];
    });
};
