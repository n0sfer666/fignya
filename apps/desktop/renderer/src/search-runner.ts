import type { SearchHit } from "@fignya/model";

export type SearchResult = { query: string; hits: SearchHit[] };

export type SearchRunner = {
  later: (query: string) => void;
  now: (query: string) => Promise<SearchHit[] | undefined>;
  dispose: () => void;
};

export const createSearchRunner = (
  search: (query: string) => Promise<SearchHit[]>,
  onResult: (result: SearchResult) => void,
  delay: number,
): SearchRunner => {
  let asked = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const now = async (query: string): Promise<SearchHit[] | undefined> => {
    clearTimeout(timer);
    asked += 1;
    const ticket = asked;
    const hits = await search(query).catch((error: unknown) => {
      console.error(`fignya: search: ${String(error)}`);
      return undefined;
    });
    if (ticket !== asked || !hits) return undefined;
    onResult({ query, hits });
    return hits;
  };
  const later = (query: string): void => {
    clearTimeout(timer);
    asked += 1;
    timer = setTimeout(() => void now(query), delay);
  };
  const dispose = (): void => {
    clearTimeout(timer);
    asked += 1;
  };
  return { later, now, dispose };
};
