const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const sameList = (a: readonly unknown[], b: readonly unknown[]): boolean => a.length === b.length && a.every((item, i) => sameValue(item, b[i]));

const sameRecord = (a: Record<string, unknown>, b: Record<string, unknown>): boolean => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => key in b && sameValue(a[key], b[key]));
};

export const sameValue = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && sameList(a, b);
  return isRecord(a) && isRecord(b) && sameRecord(a, b);
};
