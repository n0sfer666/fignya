import { rec, recs, str, type Rec } from "../../packages/fig-import/src/fig/guards";
import { instanceResolver } from "../../packages/fig-import/src/convert/instance-resolver-cache";
import { componentKeys } from "../../packages/fig-import/src/tree/component-keys";
import { guidKey, parentKey, type FigNode } from "../../packages/fig-import/src/tree/node-index";
import { figIndex } from "./fig-index";

const { byKey } = figIndex();
const resolve = instanceResolver(byKey);
const keysOf = componentKeys(byKey);
const namePath = (node: FigNode, root: string): string[] => {
  const names: string[] = [];
  for (let n: FigNode | undefined = node; n && n.key !== root; n = byKey.get(parentKey(n.raw))) {
    const parent = byKey.get(parentKey(n.raw));
    const name = str(n.raw, "name") ?? "";
    const nth = parent ? parent.children.filter((c) => (str(c.raw, "name") ?? "") === name).indexOf(n) : 0;
    names.unshift(`${name}#${nth}`);
  }
  return names;
};
const byNames = (root: FigNode, names: string[]): FigNode | undefined => {
  let n: FigNode | undefined = root;
  for (const step of names) {
    const [name, nth] = [step.slice(0, step.lastIndexOf("#")), Number(step.slice(step.lastIndexOf("#") + 1))];
    n = n?.children.filter((c) => (str(c.raw, "name") ?? "") === name)[nth];
  }
  return n;
};
const asGuid = (key: string): Rec => { const [sessionID, localID] = key.split(":").map(Number); return { sessionID, localID }; };
const keyOf = (n: FigNode): string => { const k = rec(n.raw, "overrideKey"); return k ? guidKey(k) : n.key; };
let total = 0, moved = 0, unresolved = 0, missing = 0, self = 0, foreign = 0, depthMoved = 0;
for (const node of byKey.values()) {
  if (node.type !== "INSTANCE") continue;
  const symbolData = rec(node.raw, "symbolData") ?? {};
  const from = guidKey(rec(symbolData, "symbolID"));
  const fromRoot = byKey.get(from);
  const fromKeys = keysOf(from);
  const dests = new Set<string>();
  for (const it of recs(node.raw, "prototypeInteractions")) for (const a of recs(it, "actions")) if (str(a, "navigationType") === "SWAP_STATE" && rec(a, "transitionNodeID")) dests.add(guidKey(rec(a, "transitionNodeID")));
  for (const d of dests) {
    const toRoot = byKey.get(d);
    if (!toRoot || !fromRoot) continue;
    const translate = (keys: string[], src: string, dst: string): string[] | undefined => {
      const [head, ...rest] = keys;
      if (head === undefined) return [];
      if (src === dst) return keys;
      const first = keysOf(src).nodes.get(head);
      const dstRoot = byKey.get(dst);
      if (!first || !dstRoot) return undefined;
      const twin = byNames(dstRoot, namePath(first, src));
      if (!twin) return undefined;
      const deeper = rest.length === 0 ? [] : translate(rest, guidKey(rec(rec(first.raw, "symbolData"), "symbolID")), guidKey(rec(rec(twin.raw, "symbolData"), "symbolID")));
      return deeper && [keyOf(twin), ...deeper];
    };
    const overrides = recs(symbolData, "symbolOverrides").flatMap((o) => {
      const keys = recs(rec(o, "guidPath"), "guids").map(guidKey);
      total++;
      if (fromKeys.self.has(keys[0] ?? "")) { self++; return []; }
      const moved2 = translate(keys, from, d);
      if (!moved2) { missing++; return []; }
      moved++;
      return [{ ...o, guidPath: { guids: moved2.map(asGuid) } }];
    });
    const r = resolve({ ...node, key: `${node.key}#${d}`, raw: { ...node.raw, derivedSymbolData: [], symbolData: { ...symbolData, symbolID: asGuid(d), symbolOverrides: overrides } } });
    unresolved += r.unresolved;
  }
}
console.log({ total, moved, depthMoved, self, foreign, noTwinInTarget: missing, unresolvedAfterMove: unresolved, ownUnresolved: [...byKey.values()].filter((n) => n.type === "INSTANCE").reduce((s, n) => s + resolve(n).unresolved, 0) });
