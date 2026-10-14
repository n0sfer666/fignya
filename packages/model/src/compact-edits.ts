import type { Edit } from "./edit";
import { pathKey } from "./override";

const merged = (current: Edit | undefined, next: Edit): Edit => {
  if (!current) return next;
  const style = current.style || next.style ? { style: { ...current.style, ...next.style } } : {};
  const text = next.text ?? current.text;
  return { target: current.target, ...style, ...(text === undefined ? {} : { text }) };
};

export const compactEdits = (edits: readonly Edit[]): Edit[] => {
  const byTarget = new Map<string, Edit>();
  for (const edit of edits) {
    const key = pathKey(edit.target);
    byTarget.set(key, merged(byTarget.get(key), edit));
  }
  return [...byTarget.values()];
};
