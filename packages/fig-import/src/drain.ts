export const drain = <T>(steps: Generator<unknown, T>): T => {
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
};
