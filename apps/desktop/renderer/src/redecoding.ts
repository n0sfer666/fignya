export const redecoding = (decode: () => Promise<void>, ms: number): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    let running = 0;
    const start = (): void => {
      running += 1;
      Promise.resolve()
        .then(decode)
        .then(
          () => {
            clearTimeout(timer);
            resolve();
          },
          (error: unknown) => {
            running -= 1;
            if (running > 0) return;
            clearTimeout(timer);
            reject(error);
          },
        );
    };
    const timer = setTimeout(start, ms);
    start();
  });
