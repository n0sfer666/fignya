export const decodedWithin = (decode: () => Promise<void>, ms: number): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const elapsed = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return Promise.race([Promise.resolve().then(decode), elapsed]).finally(() => clearTimeout(timer));
};
