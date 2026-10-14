export type ScreenRevisions = {
  bump: (screenId: string) => number;
  of: (screenId: string) => number;
  touch: () => void;
  edited: () => boolean;
};

export const screenRevisions = (): ScreenRevisions => {
  const revisions = new Map<string, number>();
  let touched = false;
  return {
    bump: (screenId) => {
      const next = (revisions.get(screenId) ?? 0) + 1;
      revisions.set(screenId, next);
      return next;
    },
    of: (screenId) => revisions.get(screenId) ?? 0,
    touch: () => {
      touched = true;
    },
    edited: () => touched || revisions.size > 0,
  };
};
