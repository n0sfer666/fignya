import type { NodeId } from "@fignya/model";
import { rec, recs, str, type Rec } from "../fig/guards";
import { guidKey } from "../tree/node-index";

const NO_NODE = 0xffffffff;

const isNavigation = (action: Rec): boolean => str(action, "connectionType") === "INTERNAL_NODE" && str(action, "navigationType") === "NAVIGATE";

const targetOf = (action: Rec): NodeId | undefined => {
  const target = rec(action, "transitionNodeID");
  return target && target.sessionID !== NO_NODE && target.localID !== NO_NODE ? guidKey(target) : undefined;
};

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
