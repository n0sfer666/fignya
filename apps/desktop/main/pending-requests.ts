export type PendingRequests<T> = {
  ask: (send: (reqId: number) => void) => Promise<T>;
  settle: (reqId: number, value: T) => void;
  reject: (reqId: number, error: Error) => void;
  fail: (error: Error) => void;
};

type Waiting<T> = { resolve: (value: T) => void; reject: (error: Error) => void };

export const pendingRequests = <T>(): PendingRequests<T> => {
  const waiting = new Map<number, Waiting<T>>();
  let lastId = 0;
  let failure: Error | undefined;
  return {
    ask: (send) => {
      if (failure) return Promise.reject(failure);
      lastId += 1;
      const reqId = lastId;
      return new Promise<T>((resolve, reject) => {
        waiting.set(reqId, { resolve, reject });
        send(reqId);
      });
    },
    settle: (reqId, value) => {
      waiting.get(reqId)?.resolve(value);
      waiting.delete(reqId);
    },
    reject: (reqId, error) => {
      waiting.get(reqId)?.reject(error);
      waiting.delete(reqId);
    },
    fail: (error) => {
      failure = error;
      for (const { reject } of waiting.values()) reject(error);
      waiting.clear();
    },
  };
};
