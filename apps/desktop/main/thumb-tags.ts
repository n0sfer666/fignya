import type { Screen } from "@fignya/model";
import type { ThumbFocus } from "../shared/api";
import { BASE_TIER } from "../shared/thumb-tiers";
import { effectiveTier } from "./thumb-scale";

export type ThumbTag = { page: string; screen: Screen; tier: number };

export const onPage =
  (pageId: string) =>
  (tag: ThumbTag): boolean =>
    tag.page === pageId;

export const inFocus = ({ tier, screenIds }: ThumbFocus): ((tag: ThumbTag) => boolean) => {
  const ids = new Set(screenIds);
  return (tag) => ids.has(tag.screen.id) && (tag.tier === BASE_TIER || tag.tier === effectiveTier(tag.screen.width, tag.screen.height, tier));
};
