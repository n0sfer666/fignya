type Settled<T> = { kind: "done"; value: T } | { kind: "failed"; error: unknown };

const settle = <T>(make: () => T): Settled<T> => {
  try {
    return { kind: "done", value: make() };
  } catch (error: unknown) {
    return { kind: "failed", error };
  }
};

export const lazy = <T>(make: () => T): (() => T) => {
  let pending: (() => T) | undefined = make;
  let settled: Settled<T> | undefined;
  return () => {
    if (!settled && pending) [settled, pending] = [settle(pending), undefined];
    if (!settled || settled.kind === "failed") throw settled?.error;
    return settled.value;
  };
};
