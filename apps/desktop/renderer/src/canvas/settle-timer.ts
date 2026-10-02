export type SettleTimer = { restart: () => void; ensure: () => void; cancel: () => void };

export const settleTimer = (ms: number, run: () => void): SettleTimer => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fire = (): void => {
    timer = undefined;
    run();
  };
  return {
    restart: () => {
      clearTimeout(timer);
      timer = setTimeout(fire, ms);
    },
    ensure: () => {
      timer ??= setTimeout(fire, ms);
    },
    cancel: () => {
      clearTimeout(timer);
      timer = undefined;
    },
  };
};
