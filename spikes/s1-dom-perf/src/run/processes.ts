export type Proc = { pid: number; ppid: number; rssKb: number; ageS: number; comm: string };

const etimeSeconds = (etime: string): number => {
  const [days, rest] = etime.includes("-") ? etime.split("-") : ["0", etime];
  const parts = (rest ?? "").split(":").map(Number).reverse();
  return Number(days) * 86400 + (parts[0] ?? 0) + (parts[1] ?? 0) * 60 + (parts[2] ?? 0) * 3600;
};

export const listProcesses = async (): Promise<Proc[]> => {
  const out = await Bun.$`ps -axo pid=,ppid=,rss=,etime=,comm=`.text();
  return out.split("\n").flatMap((line) => {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
    if (!match) return [];
    const [, pid, ppid, rss, etime, comm] = match;
    return [{ pid: Number(pid), ppid: Number(ppid), rssKb: Number(rss), ageS: etimeSeconds(etime ?? "0"), comm: comm ?? "" }];
  });
};

export const descendants = (all: Proc[], root: number): Proc[] => {
  const found = all.filter((p) => p.pid === root);
  for (let i = 0; i < found.length; i += 1) {
    const parent = found[i];
    if (parent) found.push(...all.filter((p) => p.ppid === parent.pid));
  }
  return found;
};

export const webkitSince = (all: Proc[], maxAgeS: number): Proc[] =>
  all.filter((p) => p.comm.includes("com.apple.WebKit") && p.ageS <= maxAgeS);

export type Rss = { totalMb: number; processes: { name: string; mb: number }[] };

export const summarizeRss = (procs: Proc[]): Rss => {
  const unique = [...new Map(procs.map((p) => [p.pid, p])).values()];
  const mb = (kb: number): number => Math.round(kb / 1024);
  return {
    totalMb: mb(unique.reduce((sum, p) => sum + p.rssKb, 0)),
    processes: unique.map((p) => ({ name: p.comm.split("/").pop() ?? p.comm, mb: mb(p.rssKb) })),
  };
};
