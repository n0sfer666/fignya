import type { DesignNode, NodeId } from "./node";

export type SearchMatch = "id" | "name";

export type SearchPlace = { pageId: string; screenId: NodeId };

export type SearchHit = {
  match: SearchMatch;
  target: NodeId[];
  kind: DesignNode["kind"];
  trail: string[];
  hidden: boolean;
  place?: SearchPlace;
};
