import { sleep, type Evaluate } from "./cdp";

export type ThumbCounts = { loaded: number; total: number; eager: number; lazy: number };

const field = (s: unknown, k: string): number => (typeof s === "object" && s !== null && k in s ? Number(Reflect.get(s, k)) : -1);

export const visibility = (ev: Evaluate): Promise<unknown> => ev("document.visibilityState");

export const openLargestPage = async (ev: Evaluate): Promise<number> => {
  const step = (open: "other" | "largest"): Promise<unknown> =>
    ev(`(() => { const lis = [...document.querySelectorAll("ul.pages li")]; const count = (li) => Number(li.querySelector(".count")?.textContent ?? 0); const largest = lis.reduce((a, b) => (count(b) > count(a) ? b : a)); const li = "${open}" === "largest" ? largest : lis.find((x) => x !== largest); if ("${open}" === "other" && !largest.classList.contains("active")) return 0; li?.click(); return count(largest); })()`);
  if ((await step("other")) !== 0) await sleep(500);
  const picked = await step("largest");
  return typeof picked === "number" ? picked : 0;
};

export const thumbCounts = async (ev: Evaluate): Promise<ThumbCounts> => {
  const s = await ev(
    `(() => { const imgs = [...document.querySelectorAll(".screen img")]; return { loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length, total: imgs.length, eager: imgs.filter((i) => i.loading === "eager").length, lazy: imgs.filter((i) => i.loading === "lazy").length }; })()`,
  );
  return { loaded: field(s, "loaded"), total: field(s, "total"), eager: field(s, "eager"), lazy: field(s, "lazy") };
};

export const fitZoom = async (ev: Evaluate): Promise<string> =>
  String(await ev(`(() => { const w = document.querySelector(".world"); const el = w?.parentElement; return (w?.style.transform.match(/scale\\(([^)]+)\\)/)?.[1] ?? "?") + " in " + el?.clientWidth + "×" + el?.clientHeight; })()`));
