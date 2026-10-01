export const mapLimited = async <TItem, TResult>(items: readonly TItem[], limit: number, map: (item: TItem) => Promise<TResult>): Promise<TResult[]> => {
  const results = new Array<TResult>(items.length);
  const entries = items.entries();
  const worker = async (): Promise<void> => {
    for (const [index, item] of entries) results[index] = await map(item);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};
