import { isRec, type Rec } from "./guards";
import { STYLE_REFS } from "./style-refs";

type Shape = { keep: ReadonlySet<string>; nested?: Readonly<Record<string, Shape>> };

const STYLE_FIELDS = [
  "visible", "transform", "size", "opacity",
  "stackMode", "stackWrap", "stackSpacing", "stackCounterSpacing", "stackHorizontalPadding", "stackVerticalPadding",
  "stackPaddingRight", "stackPaddingBottom", "stackPrimaryAlignItems", "stackCounterAlignItems",
  "stackPositioning", "stackChildPrimaryGrow", "stackChildAlignSelf",
  "cornerRadius", "rectangleTopLeftCornerRadius", "rectangleTopRightCornerRadius",
  "rectangleBottomRightCornerRadius", "rectangleBottomLeftCornerRadius", "frameMaskDisabled",
  "fillPaints", "strokePaints", "strokeWeight", "strokeAlign", "effects",
  "borderStrokeWeightsIndependent", "borderTopWeight", "borderRightWeight", "borderBottomWeight", "borderLeftWeight",
  "fillGeometry", "strokeGeometry", "arcData",
  "textData", "fontName", "fontSize", "lineHeight", "letterSpacing", "textAlignHorizontal",
  "textAutoResize", "textTruncation", "maxLines", "textExplicitLayoutVersion", "textCase", "textDecoration",
];

const TEXT: Shape = { keep: new Set(["characters"]) };

const GEOMETRY: Shape = { keep: new Set(["windingRule", "commandsBlob"]) };

const STYLE_REF: Shape = { keep: new Set(["assetRef", "guid"]), nested: { assetRef: { keep: new Set(["key"]) } } };

const REF_KEYS = Object.keys(STYLE_REFS);

const REF_SHAPES: Readonly<Record<string, Shape>> = Object.fromEntries(REF_KEYS.map((key) => [key, STYLE_REF]));

const ASSIGNMENT: Shape = {
  keep: new Set(["defID", "value", "varValue"]),
  nested: {
    value: { keep: new Set(["boolValue", "textValue", "guidValue"]), nested: { textValue: TEXT } },
    varValue: { keep: new Set(["value"]), nested: { value: { keep: new Set(["boolValue", "textDataValue", "symbolIdValue"]), nested: { textDataValue: TEXT } } } },
  },
};

const OVERRIDE: Shape = {
  keep: new Set([...STYLE_FIELDS, ...REF_KEYS, "guidPath", "overriddenSymbolID", "componentPropAssignments"]),
  nested: { textData: TEXT, componentPropAssignments: ASSIGNMENT, ...REF_SHAPES },
};

const NODE: Shape = {
  keep: new Set([...STYLE_FIELDS, ...REF_KEYS, "guid", "parentIndex", "type", "name", "horizontalConstraint", "verticalConstraint", "symbolData", "overrideKey", "derivedSymbolData", "componentPropAssignments", "componentPropRefs", "key", "styleType",
    "variableDataValues", "variableSetID", "variableSetModes", "variableModeBySetMap"]),
  nested: {
    ...REF_SHAPES,
    textData: TEXT,
    symbolData: { keep: new Set(["symbolID", "symbolOverrides"]), nested: { symbolOverrides: OVERRIDE } },
    derivedSymbolData: { keep: new Set(["guidPath", "size", "transform", "fillGeometry", "strokeGeometry"]), nested: { fillGeometry: GEOMETRY, strokeGeometry: GEOMETRY } },
    componentPropAssignments: ASSIGNMENT,
    componentPropRefs: { keep: new Set(["defID", "componentPropNodeField"]) },
  },
};

const slimRec = (value: Rec, shape: Shape): Rec =>
  Object.fromEntries(Object.entries(value).flatMap(([key, v]) => (shape.keep.has(key) ? [[key, slimValue(v, shape.nested?.[key])]] : [])));

const slimValue = (value: unknown, shape: Shape | undefined): unknown => {
  if (!shape) return value;
  if (Array.isArray(value)) return value.map((v) => slimValue(v, shape));
  return isRec(value) ? slimRec(value, shape) : value;
};

export const slimNode = (raw: Rec): Rec => slimRec(raw, NODE);
