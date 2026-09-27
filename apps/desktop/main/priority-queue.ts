export type PriorityQueue = <TResult>(priority: number, task: () => Promise<TResult>) => Promise<TResult>;

type Job = { priority: number; run: () => Promise<void> };

const takeNext = (jobs: Job[]): Job | undefined => {
  const job = jobs.reduce<Job | undefined>((best, candidate) => (best && best.priority <= candidate.priority ? best : candidate), undefined);
  if (job) jobs.splice(jobs.indexOf(job), 1);
  return job;
};

export const priorityQueue = (): PriorityQueue => {
  const jobs: Job[] = [];
  let busy = false;
  const pump = (): void => {
    const job = busy ? undefined : takeNext(jobs);
    if (!job) return;
    busy = true;
    void job.run().finally(() => {
      busy = false;
      pump();
    });
  };
  return (priority, task) =>
    new Promise((resolve, reject) => {
      jobs.push({ priority, run: () => Promise.resolve().then(task).then(resolve, reject) });
      pump();
    });
};
