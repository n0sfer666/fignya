export type FieldMap = readonly (readonly [target: string, source: string])[];

const same = (keys: readonly string[]): FieldMap => keys.map((key) => [key, key]);

export const STYLE_REFS: Readonly<Record<string, FieldMap>> = {
  styleIdForFill: same(["fillPaints"]),
  styleIdForStrokeFill: [["strokePaints", "fillPaints"]],
  styleIdForEffect: same(["effects"]),
  styleIdForText: same(["fontName", "fontSize", "lineHeight", "letterSpacing", "textCase", "textDecoration"]),
};
