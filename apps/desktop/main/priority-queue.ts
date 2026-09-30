export type PriorityQueue<TTag> = {
  run: <TResult>(priority: number, tag: TTag, task: () => Promise<TResult>) => Promise<TResult | undefined>;
  keepOnly: (keep: (tag: TTag) => boolean) => void;
  wants: (tag: TTag) => boolean;
};

type Job<TTag> = { priority: number; tag: TTag; run: () => Promise<void>; drop: () => void };

const takeNext = <TTag>(jobs: Job<TTag>[], wants: (tag: TTag) => boolean): Job<TTag> | undefined => {
  const first = (a: Job<TTag>, b: Job<TTag>): boolean => (wants(a.tag) === wants(b.tag) ? a.priority <= b.priority : wants(a.tag));
  const job = jobs.reduce<Job<TTag> | undefined>((best, candidate) => (best && first(best, candidate) ? best : candidate), undefined);
  if (job) jobs.splice(jobs.indexOf(job), 1);
  return job;
};

export const priorityQueue = <TTag>(): PriorityQueue<TTag> => {
  let jobs: Job<TTag>[] = [];
  let wants: (tag: TTag) => boolean = () => true;
  let busy = false;
  const pump = (): void => {
    const job = busy ? undefined : takeNext(jobs, wants);
    if (!job) return;
    busy = true;
    void job.run().finally(() => {
      busy = false;
      pump();
    });
  };
  return {
    run: (priority, tag, task) =>
      new Promise((resolve, reject) => {
        jobs.push({ priority, tag, run: () => Promise.resolve().then(task).then(resolve, reject), drop: () => resolve(undefined) });
        pump();
      }),
    keepOnly: (keep) => {
      wants = keep;
      const dropped = jobs.filter((job) => !keep(job.tag));
      jobs = jobs.filter((job) => keep(job.tag));
      for (const job of dropped) job.drop();
    },
    wants: (tag) => wants(tag),
  };
};
