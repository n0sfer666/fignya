import { num, rec, str, type Rec } from "../../packages/fig-import/src/fig/guards";
import { isFlex } from "../../packages/fig-import/src/convert/layout";
import { isVectorNode } from "../../packages/fig-import/src/convert/vector";
import { walkFig } from "./fig-walk";
import { turnKind } from "./turn-kind";

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
const viaOverride = tally();
const { index, instances, targets, unresolved } = walkFig((node, parent, label, _owner, via) => count(via === "raw" ? raw : viaOverride, node, parent, label));

console.log(JSON.stringify({ nodes: index.byKey.size, raw, instances, targets, unresolved, viaOverride, samples }, null, 1));
