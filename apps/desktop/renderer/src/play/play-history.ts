import type { NodeId } from "@fignya/model";

export type PlayHistory = { current: () => NodeId; previous: () => NodeId | undefined; go: (id: NodeId) => void; back: () => void };

export const createPlayHistory = (start: NodeId): PlayHistory => {
  const steps = [start];
  return {
    current: () => steps[steps.length - 1] ?? start,
    previous: () => steps[steps.length - 2],
    go: (id) => void steps.push(id),
    back: () => {
      if (steps.length > 1) steps.pop();
    },
  };
};
