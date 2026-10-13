export type PriorityQueue<TTag> = {
  run: <TResult>(priority: number, tag: TTag, task: () => Promise<TResult>) => Promise<TResult | undefined>;
  keepOnly: (keep: (tag: TTag) => boolean) => void;
  prefer: (preferred: (tag: TTag) => boolean) => void;
  wants: (tag: TTag) => boolean;
};

type Job<TTag> = { priority: number; tag: TTag; run: () => Promise<void>; drop: () => void };

type Rank<TTag> = (tag: TTag) => boolean;

const takeNext = <TTag>(jobs: Job<TTag>[], ranks: Rank<TTag>[]): Job<TTag> | undefined => {
  const first = (a: Job<TTag>, b: Job<TTag>): boolean => {
    const rank = ranks.find((r) => r(a.tag) !== r(b.tag));
    return rank ? rank(a.tag) : a.priority <= b.priority;
  };
  const job = jobs.reduce<Job<TTag> | undefined>((best, candidate) => (best && first(best, candidate) ? best : candidate), undefined);
  if (job) jobs.splice(jobs.indexOf(job), 1);
  return job;
};

export const priorityQueue = <TTag>(): PriorityQueue<TTag> => {
  let jobs: Job<TTag>[] = [];
  let wants: Rank<TTag> = () => true;
  let preferred: Rank<TTag> = () => false;
  let busy = false;
  const pump = (): void => {
    const job = busy ? undefined : takeNext(jobs, [wants, preferred]);
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
    prefer: (next) => {
      preferred = next;
    },
    wants: (tag) => wants(tag),
  };
};
