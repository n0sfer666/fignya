import type { DesignDocument } from "./document";
import { locateNode } from "./locate-node";
import { parseNodeQuery } from "./node-query";
import type { SearchHit } from "./search-hit";

export type Matcher = (doc: DesignDocument, query: string, limit: number) => SearchHit[];

const byId: Matcher = (doc, query) => {
  const chain = parseNodeQuery(query);
  const hit = chain && locateNode(doc, chain);
  return hit ? [hit] : [];
};

const MATCHERS: Matcher[] = [byId];

export const SEARCH_LIMIT = 50;

export const collectHits = (matchers: Matcher[], doc: DesignDocument, query: string, limit: number): SearchHit[] => {
  const hits = new Map<string, SearchHit>();
  for (const matcher of matchers) {
    if (hits.size >= limit) break;
    for (const hit of matcher(doc, query, limit - hits.size)) {
      const key = hit.target.join(";");
      if (!hits.has(key)) hits.set(key, hit);
    }
  }
  return [...hits.values()].slice(0, limit);
};

export const searchDocument = (doc: DesignDocument, query: string): SearchHit[] => collectHits(MATCHERS, doc, query, SEARCH_LIMIT);
