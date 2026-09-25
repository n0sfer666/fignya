import { pathKey, type NodeId } from "@fignya/model";
import { rec, recs, type Rec } from "../fig/guards";
import { componentOf, type ComponentKeys } from "../tree/component-keys";
import { guidKey, type FigNode } from "../tree/node-index";
import { propFields } from "./prop-fields";
import { withCharacters } from "./text-data";

type Layer = 0 | 1 | 2;

const OVERRIDE: Layer = 0;
const PROP: Layer = 1;
const DERIVED: Layer = 2;

export type Target = { ids: NodeId[]; layers: [Rec, Rec, Rec] };

export type Resolved = {
  targets: ReadonlyMap<string, Target>;
  unresolved: number;
  swapBelow: (ids: readonly NodeId[]) => NodeId | undefined;
};

export type ResolveContext = {
  byKey: ReadonlyMap<string, FigNode>;
  keysOf: (componentId: NodeId) => ComponentKeys;
  resolve: (instance: FigNode) => Resolved;
};

type Source = { keys: string[]; fields: Rec; layer: Layer };

type Assignments = { prefix: NodeId[]; list: Rec[] };

const PATH_FIELDS: ReadonlySet<string> = new Set(["guidPath", "componentPropAssignments"]);

export const mergedFields = (target: Target): Rec => ({ ...target.layers[OVERRIDE], ...target.layers[PROP], ...target.layers[DERIVED] });

const sourcesOf = (raw: Rec): Source[] => {
  const source = (fields: Rec, layer: Layer): Source => ({ keys: recs(rec(fields, "guidPath"), "guids").map(guidKey), fields, layer });
  return [
    ...recs(rec(raw, "symbolData"), "symbolOverrides").map((fields) => source(fields, OVERRIDE)),
    ...recs(raw, "derivedSymbolData").map((fields) => source(fields, DERIVED)),
  ];
};

const ownFields = (fields: Rec): Rec => {
  const own: Rec = {};
  for (const key in fields) if (!PATH_FIELDS.has(key)) own[key] = fields[key];
  if ("textData" in own && !withCharacters(rec(own, "textData"))) delete own.textData;
  return own;
};

const layeredField = (target: Target, key: string): Rec | undefined =>
  rec(target.layers[DERIVED], key) ?? rec(target.layers[PROP], key) ?? rec(target.layers[OVERRIDE], key);

export const resolveInstance = (ctx: ResolveContext, instance: FigNode): Resolved => {
  const own = componentOf(instance.raw);
  const targets = new Map<string, Target>();
  const add = (ids: NodeId[], fields: Rec, layer: Layer): void => {
    const key = pathKey(ids);
    const target = targets.get(key) ?? { ids, layers: [{}, {}, {}] };
    Object.assign(target.layers[layer], fields);
    targets.set(key, target);
  };

  const swapAt = (ids: readonly NodeId[]): NodeId | undefined => {
    const target = targets.get(pathKey(ids));
    const symbol = target ? layeredField(target, "overriddenSymbolID") : undefined;
    return symbol ? guidKey(symbol) : undefined;
  };

  const swapBelow = (ids: readonly NodeId[]): NodeId | undefined => {
    const ownSwap = swapAt(ids);
    const [head, ...rest] = ids;
    if (ownSwap !== undefined || head === undefined || rest.length === 0) return ownSwap;
    const inner = ctx.byKey.get(head);
    return inner ? ctx.resolve(inner).swapBelow(rest) : undefined;
  };

  const componentAt = (ids: readonly NodeId[]): NodeId | undefined => {
    const last = ids[ids.length - 1];
    if (last === undefined) return own;
    const node = ctx.byKey.get(last);
    return swapBelow(ids) ?? (node ? componentOf(node.raw) : undefined);
  };

  const resolveKeys = (keys: string[]): NodeId[] | undefined => {
    const ids: NodeId[] = [];
    for (const key of keys) {
      const component = componentAt(ids);
      const node = component === undefined ? undefined : ctx.keysOf(component).nodes.get(key);
      if (!node) return undefined;
      ids.push(node.key);
    }
    return ids.length > 0 ? ids : undefined;
  };

  const self = own === undefined ? new Set<string>() : ctx.keysOf(own).self;
  const targetsSelf = (keys: string[]): boolean => keys.length === 1 && self.has(keys[0] ?? "");

  const sources = sourcesOf(instance.raw).filter((source) => !targetsSelf(source.keys));
  const depth = sources.reduce((max, s) => Math.max(max, s.keys.length), 0);
  let unresolved = 0;
  let assignments: Assignments[] = [{ prefix: [], list: recs(instance.raw, "componentPropAssignments") }];
  for (let level = 1; level <= depth || assignments.length > 0; level++) {
    for (const { prefix, list } of assignments) {
      const component = componentAt(prefix);
      if (component === undefined) continue;
      for (const { node, fields } of propFields(ctx.keysOf(component), list)) add([...prefix, node.key], fields, PROP);
    }
    assignments = [];
    for (const source of sources) {
      if (source.keys.length !== level) continue;
      const ids = resolveKeys(source.keys);
      if (!ids) {
        unresolved += 1;
        continue;
      }
      add(ids, ownFields(source.fields), source.layer);
      const list = recs(source.fields, "componentPropAssignments");
      if (list.length > 0) assignments.push({ prefix: ids, list });
    }
  }
  return { targets, unresolved, swapBelow };
};
