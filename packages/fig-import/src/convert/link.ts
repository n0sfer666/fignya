import type { NodeId } from "@fignya/model";
import { rec, recs, str, type Rec } from "../fig/guards";
import { targetOf } from "./interaction-target";

const isNavigation = (action: Rec): boolean => str(action, "connectionType") === "INTERNAL_NODE" && str(action, "navigationType") === "NAVIGATE";

const clickTarget = (interaction: Rec): NodeId | undefined => {
  if (interaction.isDeleted === true || str(rec(interaction, "event"), "interactionType") !== "ON_CLICK") return undefined;
  const action = recs(interaction, "actions").find(isNavigation);
  return action && targetOf(action);
};

export const linkOf = (raw: Rec): { link?: NodeId } => {
  for (const interaction of recs(raw, "prototypeInteractions")) {
    const link = clickTarget(interaction);
    if (link !== undefined) return { link };
  }
  return {};
};
