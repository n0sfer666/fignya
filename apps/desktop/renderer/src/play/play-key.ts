export type PlayKey = "exit" | "back";

export const isPlayShortcut = (e: KeyboardEvent): boolean => e.key === "Enter" && e.altKey && (e.metaKey || e.ctrlKey) && !e.shiftKey;

export const playKey = (e: KeyboardEvent): PlayKey | undefined => {
  if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return undefined;
  if (e.key === "Escape") return "exit";
  return e.key === "ArrowLeft" || e.key === "Backspace" ? "back" : undefined;
};
