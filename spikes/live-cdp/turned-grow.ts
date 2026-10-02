import { num, rec, str, type Rec } from "../../packages/fig-import/src/fig/guards";
import { innerFieldsOf } from "../../packages/fig-import/src/convert/inner-fields";
import { instanceResolver } from "../../packages/fig-import/src/convert/instance-resolver-cache";
import { mergedFields } from "../../packages/fig-import/src/convert/instance-resolver";
import { isFlex, isFlip, rotation } from "../../packages/fig-import/src/convert/layout";
import { settledRaw } from "../../packages/fig-import/src/convert/swap-rebase";
import { isVectorNode } from "../../packages/fig-import/src/convert/vector";
import { parentKey, type FigNode } from "../../packages/fig-import/src/tree/node-index";
import { symbolNodes } from "../../packages/fig-import/src/tree/symbol-nodes";
import { figIndex } from "./fig-index";

const NOISE = 1e-6;
const index = figIndex();
const symbols = symbolNodes(index.byKey.values());
const resolve = instanceResolver(symbols);

type Kind = "none" | "flip" | "noise" | "turn";
const turnKind = (t: Rec | undefined): Kind => {
  const m = rotation(t);
  if (!m) return "none";
  if (isFlip(m)) return "flip";
  const near = (v: number, to: number): boolean => Math.abs(v - to) < NOISE;
  return near(m[0], 1) && near(m[1], 0) && near(m[2], 0) && near(m[3], 1) ? "noise" : "turn";
};

type Tally = { turnedFlow: number; noiseFlow: number; noiseStretch: number; growVector: number; growOther: number; growOtherNoise: number };
const tally = (): Tally => ({ turnedFlow: 0, noiseFlow: 0, noiseStretch: 0, growVector: 0, growOther: 0, growOtherNoise: 0 });
const samples: string[] = [];

const count = (into: Tally, raw: Rec, parent: Rec | undefined, label: string): void => {
  if (!parent || !isFlex(parent) || str(raw, "stackPositioning") === "ABSOLUTE") return;
  const kind = turnKind(rec(raw, "transform"));
  if (kind === "none" || kind === "flip") return;
  into.turnedFlow++;
  if (kind === "noise") into.noiseFlow++;
  if (kind === "noise" && str(raw, "stackChildAlignSelf") === "STRETCH") into.noiseStretch++;
  if ((num(raw, "stackChildPrimaryGrow") ?? 0) <= 0) return;
  if (isVectorNode(str(raw, "type") ?? "", raw)) {
    into.growVector++;
    return;
  }
  into.growOther++;
  if (kind === "noise") into.growOtherNoise++;
  if (samples.length < 20) samples.push(`${label} ${str(raw, "type")} «${str(raw, "name")}» ${kind}`);
};

const raw = tally();
for (const node of index.byKey.values()) count(raw, node.raw, index.byKey.get(parentKey(node.raw))?.raw, node.key);

const innerFields = innerFieldsOf(symbols, resolve);

const viaOverride = tally();
let targets = 0;
let unresolved = 0;
const instances = [...index.byKey.values()].filter((n: FigNode) => n.type === "INSTANCE");
for (const instance of instances) {
  const resolved = resolve(instance);
  unresolved += resolved.unresolved;
  for (const target of resolved.targets.values()) {
    const node = symbols.get(target.ids[target.ids.length - 1] ?? "");
    if (!node) continue;
    targets++;
    const settled = settledRaw(symbols, node, { ...innerFields(target.ids), ...mergedFields(target) });
    count(viaOverride, settled, symbols.get(parentKey(node.raw))?.raw, `${instance.key} → ${node.key}`);
  }
}

console.log(JSON.stringify({ nodes: index.byKey.size, raw, instances: instances.length, targets, unresolved, viaOverride, samples }, null, 1));
