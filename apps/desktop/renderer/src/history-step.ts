import type { HistoryStep } from "../../shared/api";

const LATIN_LETTER = /^[a-z]$/i;

const isZ = ({ key, code }: KeyboardEvent): boolean => key.toLowerCase() === "z" || (!LATIN_LETTER.test(key) && code === "KeyZ");

export const inTextField = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest("input, textarea, select, [contenteditable]") !== null;

export const historyStep = (e: KeyboardEvent): HistoryStep | undefined => {
  if (!isZ(e) || e.altKey || !(e.metaKey || e.ctrlKey)) return undefined;
  return e.shiftKey ? "redo" : "undo";
};
