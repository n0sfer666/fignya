export const retrying = <T>(attempts: number, run: () => Promise<T>, beforeRetry: (error: unknown) => Promise<void> | void): Promise<T> =>
  run().catch(async (error: unknown) => {
    if (attempts <= 1) throw error;
    await beforeRetry(error);
    return retrying(attempts - 1, run, beforeRetry);
  });
