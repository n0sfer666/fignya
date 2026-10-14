import type { Swap, SwapEvent } from "@fignya/model";
import { rec, recs, str, type Rec } from "../fig/guards";
import { targetOf } from "./interaction-target";

const EVENTS: Readonly<Record<string, SwapEvent>> = { ON_HOVER: "hover", MOUSE_ENTER: "enter", MOUSE_LEAVE: "leave", ON_CLICK: "click" };

const swapOf = (interaction: Rec): Swap[] => {
  const on = EVENTS[str(rec(interaction, "event"), "interactionType") ?? ""];
  if (interaction.isDeleted === true || on === undefined) return [];
  const action = recs(interaction, "actions").find((a) => str(a, "navigationType") === "SWAP_STATE");
  const to = action && targetOf(action);
  return to === undefined ? [] : [{ on, to }];
};

export const swapsOf = (raw: Rec): { swaps?: Swap[] } => {
  const swaps = recs(raw, "prototypeInteractions").flatMap(swapOf);
  return swaps.length > 0 ? { swaps } : {};
};
