import { pathKey, sameValue, type DesignNode, type NodeId, type Override } from "@fignya/model";
import type { Rec } from "../fig/guards";
import { parentKey, type FigNode } from "../tree/node-index";
import { VARIABLE_FIELDS, type VariablePaints } from "../tree/variables";
import { convertNode, type ConvertContext } from "./convert-node";
import { innerFieldsOf } from "./inner-fields";
import { instanceResolver } from "./instance-resolver-cache";
import { mergedFields, type Resolved, type Target } from "./instance-resolver";
import { modeFrames } from "./mode-frames";
import { modeOwner } from "./mode-owner";
import { pathModes } from "./mode-paths";
import { modeTargets } from "./mode-targets";
import { overridePatch } from "./override-patch";
import { settledRaw, swappedTo } from "./swap-rebase";
import type { BlobPaths } from "./vector";

type Base = { fields: Rec; raw: Rec; node: DesignNode };

const BINDINGS = "variableConsumptionMap";

const changes = (raw: Rec, fields: Rec): boolean => {
  for (const key in fields) if (key !== BINDINGS && !sameValue(raw[key], fields[key])) return true;
  return false;
};

const repainted = (base: Rec, next: Rec): boolean => VARIABLE_FIELDS.some((key) => !sameValue(base[key], next[key]));

export const instanceOverrides = (byKey: ReadonlyMap<string, FigNode>, pathOf: BlobPaths, paints: VariablePaints): ((instance: FigNode) => Override[]) => {
  const resolve = instanceResolver(byKey);
  const modesAt = pathModes(byKey, paints);
  const ownerOf = modeOwner(byKey, resolve);
  const framesOf = modeFrames(byKey, paints, modesAt);
  const plain: ConvertContext = { pathOf, overridesOf: () => [] };
  const convertRaw = (node: FigNode, raw: Rec): DesignNode =>
    convertNode({ ...node, raw }, { parent: byKey.get(parentKey(node.raw))?.raw ?? {}, children: [] }, plain);

  const repaintAt = (instance: FigNode | undefined, ids: readonly NodeId[], raw: Rec): Rec =>
    instance && paints.bound(raw) ? paints.repaint(raw, modesAt(instance, ids)) : raw;

  const innerFields = innerFieldsOf(byKey, resolve);

  const bases = new Map<string, Base>();
  const baseOf = (node: FigNode, ids: readonly NodeId[]): Base => {
    const key = pathKey(ids);
    const known = bases.get(key);
    if (known) return known;
    const fields = innerFields(ids);
    const settled = settledRaw(byKey, node, fields);
    const owner = ownerOf(ids);
    const raw = owner < ids.length - 1 ? repaintAt(byKey.get(ids[owner] ?? ""), ids.slice(owner + 1), settled) : settled;
    const base = { fields, raw, node: convertRaw(node, raw) };
    bases.set(key, base);
    return base;
  };

  const overrideOf = (instance: FigNode, target: Target): Override | undefined => {
    const node = byKey.get(target.ids[target.ids.length - 1] ?? "");
    if (!node) return undefined;
    const base = baseOf(node, target.ids);
    const fields = mergedFields(target);
    if (!changes(base.raw, fields) && !paints.bound(base.raw)) return undefined;
    const raw = repaintAt(instance, target.ids, settledRaw(byKey, node, { ...base.fields, ...fields }));
    if (!changes(base.raw, fields) && !repainted(base.raw, raw)) return undefined;
    const to = swappedTo(raw);
    const swapped = to !== undefined && byKey.has(to) && to !== swappedTo(base.raw);
    const componentId = base.node.kind === "instance" && swapped ? to : undefined;
    return overridePatch(target.ids, base.node, convertRaw(node, raw), componentId);
  };

  const bound = (node: FigNode, ids: NodeId[]): boolean => paints.bound(settledRaw(byKey, node, innerFields(ids)));
  const targetsOf = (instance: FigNode, resolved: Resolved): Target[] => {
    const frames = framesOf(instance, resolved);
    if (frames.length === 0) return [...resolved.targets.values()];
    const targets = new Map(resolved.targets);
    for (const ids of modeTargets(byKey, resolved, frames, bound)) {
      const key = pathKey(ids);
      if (!targets.has(key)) targets.set(key, { ids, layers: [{}, {}, {}] });
    }
    return [...targets.values()];
  };

  return (instance) =>
    targetsOf(instance, resolve(instance)).flatMap((target) => {
      const override = overrideOf(instance, target);
      return override ? [override] : [];
    });
};
