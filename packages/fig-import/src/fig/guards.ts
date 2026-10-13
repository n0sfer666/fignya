export type Rec = Record<string, unknown>;

export const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

export const rec = (o: Rec, k: string): Rec | undefined => {
  const v = o[k];
  return isRec(v) ? v : undefined;
};

export const num = (o: Rec | undefined, k: string): number | undefined => {
  const v = o?.[k];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
};

export const str = (o: Rec | undefined, k: string): string | undefined => {
  const v = o?.[k];
  return typeof v === "string" ? v : undefined;
};

export const bool = (o: Rec | undefined, k: string): boolean | undefined => {
  const v = o?.[k];
  return typeof v === "boolean" ? v : undefined;
};

export const recs = (o: Rec | undefined, k: string): Rec[] => {
  const v = o?.[k];
  return Array.isArray(v) ? v.filter(isRec) : [];
};

export const bytes = (o: Rec | undefined, k: string): Uint8Array | undefined => {
  const v = o?.[k];
  return v instanceof Uint8Array ? v : undefined;
};
