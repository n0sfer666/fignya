export type PickMode = "click" | "inner" | "deep";

const NODE = "[data-id]";

export const chainOf = (el: Element): Element[] => {
  const chain: Element[] = [];
  for (let at = el.closest(NODE); at; at = at.parentElement?.closest(NODE) ?? null) chain.unshift(at);
  return chain;
};

const sharedDepth = (chain: readonly Element[], context: readonly Element[], limit: number): number => {
  let depth = 0;
  while (depth < limit && chain[depth + 1] !== undefined && chain[depth + 1] === context[depth + 1]) depth++;
  return depth;
};

const clickPick = (chain: readonly Element[], selected: Element | undefined): Element | undefined => {
  const context = selected ? chainOf(selected) : [];
  const depth = sharedDepth(chain, context, Math.max(context.length - 2, 0));
  return chain[depth + 1] ?? chain[depth];
};

const innerPick = (chain: readonly Element[], selected: Element | undefined): Element | undefined => {
  const depth = selected ? chain.indexOf(selected) : -1;
  return depth < 0 ? clickPick(chain, selected) : (chain[depth + 1] ?? selected);
};

export const pickNode = (hit: Element, selected: Element | undefined, mode: PickMode): Element => {
  if (mode === "deep") return hit;
  const chain = chainOf(hit);
  return (mode === "inner" ? innerPick(chain, selected) : clickPick(chain, selected)) ?? hit;
};
