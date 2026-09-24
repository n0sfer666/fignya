import { isRec, type Rec } from "./guards";

const KEPT_FIELDS: ReadonlySet<string> = new Set([
  "guid", "parentIndex", "type", "name", "visible", "transform", "size", "opacity",
  "stackMode", "stackWrap", "stackSpacing", "stackHorizontalPadding", "stackVerticalPadding",
  "stackPaddingRight", "stackPaddingBottom", "stackPrimaryAlignItems", "stackCounterAlignItems",
  "stackPositioning", "stackChildPrimaryGrow", "stackChildAlignSelf",
  "cornerRadius", "rectangleTopLeftCornerRadius", "rectangleTopRightCornerRadius",
  "rectangleBottomRightCornerRadius", "rectangleBottomLeftCornerRadius", "frameMaskDisabled",
  "fillPaints", "strokePaints", "strokeWeight", "strokeAlign", "effects",
  "fillGeometry", "strokeGeometry",
  "textData", "fontName", "fontSize", "lineHeight", "letterSpacing", "textAlignHorizontal",
  "symbolData",
]);

const NESTED_FIELDS: Readonly<Record<string, ReadonlySet<string>>> = {
  symbolData: new Set(["symbolID"]),
  textData: new Set(["characters"]),
};

const pick = (value: Rec, keep: ReadonlySet<string>): Rec => Object.fromEntries(Object.entries(value).filter(([key]) => keep.has(key)));

const slimField = (key: string, value: unknown): unknown => {
  const nested = NESTED_FIELDS[key];
  return nested && isRec(value) ? pick(value, nested) : value;
};

export const slimNode = (raw: Rec): Rec =>
  Object.fromEntries(Object.entries(raw).flatMap(([key, value]) => (KEPT_FIELDS.has(key) ? [[key, slimField(key, value)]] : [])));
