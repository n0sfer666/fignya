import { rec, recs, str, type Rec } from "../../packages/fig-import/src/fig/guards";
import { guidKey, parentKey } from "../../packages/fig-import/src/tree/node-index";
import { figIndex } from "./fig-index";

const { byKey } = figIndex();
const count = (m: Map<string, number>, k: string): void => void m.set(k, (m.get(k) ?? 0) + 1);
const events = new Map<string, number>();
const holders = new Map<string, number>();
const dest = new Map<string, number>();
const variantsWithSwap = new Set<string>();
const parentOf = (key: string): string => parentKey(byKey.get(key)?.raw ?? {});
const variantOf = (key: string): string | undefined => {
  for (let k: string | undefined = key; k; k = parentOf(k)) if (byKey.get(k)?.type === "SYMBOL") return k;
  return undefined;
};
for (const node of byKey.values()) {
  for (const it of recs(node.raw, "prototypeInteractions")) {
    if (it.isDeleted === true) continue;
    for (const a of recs(it, "actions")) {
      const ev = str(rec(it, "event"), "interactionType") ?? "?";
      count(events, `${ev} ${str(a, "navigationType") ?? str(a, "connectionType") ?? "?"}`);
      if (str(a, "navigationType") !== "SWAP_STATE") continue;
      const v = variantOf(node.key);
      count(holders, `${node.type}${v === node.key ? " (variant root)" : v ? " (inside variant)" : " (outside)"}`);
      const t = rec(a, "transitionNodeID");
      const tk = t ? guidKey(t) : "";
      const d = byKey.get(tk);
      count(dest, !d ? "missing" : d.type !== "SYMBOL" ? `type ${d.type}` : v && parentOf(tk) === parentOf(v) ? "sibling variant" : "other symbol");
      if (v) variantsWithSwap.add(v);
    }
  }
}
const pageOf = (key: string): string => {
  let k = key;
  for (let p = parentOf(k); p && byKey.get(p)?.type !== "DOCUMENT"; p = parentOf(k)) k = p;
  return str(byKey.get(k)?.raw ?? {}, "name") ?? "?";
};
const interactiveInstances = new Map<string, number>();
for (const node of byKey.values()) {
  if (node.type !== "INSTANCE") continue;
  const sym = rec(rec(node.raw, "symbolData") ?? {}, "symbolID");
  if (sym && variantsWithSwap.has(guidKey(sym))) count(interactiveInstances, pageOf(node.key));
}
console.log({ events: Object.fromEntries(events), holders: Object.fromEntries(holders), dest: Object.fromEntries(dest), variantsWithSwap: variantsWithSwap.size, interactiveInstancesByPage: Object.fromEntries(interactiveInstances) });
