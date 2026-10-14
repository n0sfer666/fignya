import type { DesignDocument } from "./document";
import { locateNode } from "./locate-node";
import { byIdMatcher, collectHits, SEARCH_LIMIT, type Matcher } from "./search-document";
import type { SearchHit } from "./search-hit";

const byName: Matcher = (doc, query, limit) => {
  const needle = query.trim().toLowerCase();
  const hits: SearchHit[] = [];
  if (needle.length === 0) return hits;
  for (const node of doc.nodes.values()) {
    if (hits.length >= limit) break;
    const hit = node.name.toLowerCase().includes(needle) ? locateNode(doc, [node.id]) : undefined;
    if (hit) hits.push({ ...hit, match: "name" });
  }
  return hits;
};

export const searchNames = (doc: DesignDocument, query: string): SearchHit[] => collectHits([byIdMatcher, byName], doc, query, SEARCH_LIMIT);
