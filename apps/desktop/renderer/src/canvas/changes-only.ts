export const changesOnly = <T>(key: (value: T) => string, send: (value: T) => void): ((value: T) => void) => {
  let last: string | undefined;
  return (value) => {
    const next = key(value);
    if (next === last) return;
    last = next;
    send(value);
  };
};
