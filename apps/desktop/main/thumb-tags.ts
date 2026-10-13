import { contentOf, type Screen } from "@fignya/model";
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
  const wanted = (screen: Screen): number => {
    const box = contentOf(screen);
    return effectiveTier(box.width, box.height, tier);
  };
  return (tag) => ids.has(tag.screen.id) && (tag.tier === BASE_TIER || tag.tier === wanted(tag.screen));
};
