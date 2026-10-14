import { rec, recs, type Rec } from "../fig/guards";
import { guidKey } from "../tree/node-index";

const INTERACTIONS = "prototypeInteractions";

const idOf = (interaction: Rec): string | undefined => {
  const id = rec(interaction, "id");
  return id ? guidKey(id) : undefined;
};

const keyed = (interaction: Rec): [string, Rec][] => {
  const id = idOf(interaction);
  return id === undefined ? [] : [[id, interaction]];
};

const mergedActions = (under: Rec[], over: Rec[]): Rec[] =>
  under.length === over.length ? under.map((action, i) => ({ ...action, ...over[i] })) : over;

const mergedInteraction = (under: Rec, over: Rec): Rec =>
  "actions" in over ? { ...under, ...over, actions: mergedActions(recs(under, "actions"), recs(over, "actions")) } : { ...under, ...over };

const mergedInteractions = (under: Rec[], over: Rec[]): Rec[] => {
  if (over.length === 0 || over.some((o) => idOf(o) === undefined)) return over;
  const byId = new Map(over.flatMap(keyed));
  const known = new Set(under.flatMap((u) => idOf(u) ?? []));
  const merged = under.map((u) => {
    const o = byId.get(idOf(u) ?? "");
    return o ? mergedInteraction(u, o) : u;
  });
  return [...merged, ...over.filter((o) => !known.has(idOf(o) ?? ""))];
};

export const overlayFields = (under: Rec, over: Rec): Rec => {
  const merged = { ...under, ...over };
  return INTERACTIONS in under && INTERACTIONS in over ? { ...merged, [INTERACTIONS]: mergedInteractions(recs(under, INTERACTIONS), recs(over, INTERACTIONS)) } : merged;
};
