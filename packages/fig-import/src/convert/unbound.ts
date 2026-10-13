import { isRec } from "../fig/guards";

const RESOLVED_KEYS: ReadonlySet<string> = new Set(["color", "authoredColor"]);

const unboundItem = (item: unknown): unknown =>
  isRec(item) && isRec(item.colorVar) ? Object.fromEntries(Object.entries(item).filter(([key]) => !RESOLVED_KEYS.has(key))) : item;

export const unbound = (value: unknown): unknown => (Array.isArray(value) ? value.map(unboundItem) : value);
