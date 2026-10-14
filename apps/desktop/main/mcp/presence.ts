export type Presence = {
  touch: () => void;
  streamOpened: () => () => void;
  tick: () => void;
  reset: () => void;
};

export const IDLE_MS = 120_000;

export const createPresence = (changed: (connected: boolean) => void, now: () => number = Date.now): Presence => {
  let streams = 0;
  let epoch = 0;
  let last = Number.NEGATIVE_INFINITY;
  let shown = false;
  const update = (): void => {
    const connected = streams > 0 || now() - last < IDLE_MS;
    if (connected === shown) return;
    shown = connected;
    changed(connected);
  };
  return {
    touch: () => {
      last = now();
      update();
    },
    streamOpened: () => {
      streams += 1;
      update();
      const opened = epoch;
      let open = true;
      return () => {
        if (!open || opened !== epoch) return;
        open = false;
        streams -= 1;
        update();
      };
    },
    tick: update,
    reset: () => {
      epoch += 1;
      streams = 0;
      last = Number.NEGATIVE_INFINITY;
      update();
    },
  };
};
