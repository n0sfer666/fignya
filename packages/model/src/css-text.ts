import { backgroundDeclarations } from "./css-background";
import { dropShadow, px, quoted, rgba, round, shadow, sides, type Declaration, type ImageUrl } from "./css-values";
import type { Style, StyleValues } from "./style";

type Serializers = { [K in keyof StyleValues]: (value: StyleValues[K], url: ImageUrl) => Declaration[] };

const one = (name: string, value: string): Declaration[] => [[name, value]];

const SERIALIZERS: Serializers = {
  position: (v) => one("position", v),
  left: (v) => one("left", px(v)),
  top: (v) => one("top", px(v)),
  width: (v) => one("width", px(v)),
  height: (v) => one("height", px(v)),
  minWidth: (v) => one("min-width", px(v)),
  minHeight: (v) => one("min-height", px(v)),
  transform: (m) => [
    ["transform", `matrix(${m.map((n) => round(n, 4)).join(",")},0,0)`],
    ["transform-origin", "0 0"],
  ],
  scale: ([x, y]) => one("scale", `${x} ${y}`),
  display: (v) => one("display", v),
  flexDirection: (v) => one("flex-direction", v),
  flexWrap: (v) => one("flex-wrap", v),
  gap: (v) => one("gap", px(v)),
  rowGap: (v) => one("row-gap", px(v)),
  padding: (v) => one("padding", sides(v)),
  justifyContent: (v) => one("justify-content", v),
  alignItems: (v) => one("align-items", v),
  alignSelf: (v) => one("align-self", v),
  flexGrow: (v) => one("flex-grow", String(v)),
  flexShrink: (v) => one("flex-shrink", String(v)),
  flexBasis: (v) => one("flex-basis", px(v)),
  borderRadius: (v) => one("border-radius", v === "50%" ? v : sides(v)),
  outline: (v) => one("outline", `${px(v.width)} solid ${rgba(v.color)}`),
  boxShadow: (v) => one("box-shadow", v.map(shadow).join(",")),
  dropShadow: (v) => one("filter", v.map(dropShadow).join(" ")),
  filterBlur: (v) => one("filter", `blur(${px(v)})`),
  backdropBlur: (v) => one("backdrop-filter", `blur(${px(v)})`),
  opacity: (v) => one("opacity", String(round(v, 3))),
  overflow: (v) => one("overflow", v),
  background: (v, url) => backgroundDeclarations(v, url),
  color: (v) => one("color", rgba(v)),
  fontFamily: (v) => one("font-family", `${quoted(v)},sans-serif`),
  fontSize: (v) => one("font-size", px(v)),
  fontWeight: (v) => one("font-weight", String(v)),
  fontStyle: (v) => one("font-style", v),
  lineHeight: (v) => one("line-height", v === "normal" ? v : px(v)),
  letterSpacing: (v) => one("letter-spacing", `${round(v.value, 4)}${v.unit}`),
  textAlign: (v) => one("text-align", v),
  textTransform: (v) => one("text-transform", v),
  textDecoration: (v) => one("text-decoration", v),
  fontVariantCaps: (v) => one("font-variant-caps", v),
  whiteSpace: (v) => one("white-space", v),
  overflowWrap: (v) => one("overflow-wrap", v),
  textOverflow: (v) => one("text-overflow", v),
  lineClamp: (v) => [
    ["-webkit-box-orient", "vertical"],
    ["-webkit-line-clamp", String(v)],
  ],
};

export const isStyleKey = (key: string): key is keyof StyleValues => key in SERIALIZERS;

const KEYS = Object.keys(SERIALIZERS).filter(isStyleKey);

const declarationsOf = <K extends keyof StyleValues>(style: Style, key: K, url: ImageUrl): Declaration[] => {
  const value = style[key];
  return value === undefined ? [] : SERIALIZERS[key](value, url);
};

const withJoinedFilters = (declarations: Declaration[]): Declaration[] => {
  const filters = declarations.filter(([name]) => name === "filter");
  if (filters.length < 2) return declarations;
  return [...declarations.filter(([name]) => name !== "filter"), ["filter", filters.map(([, value]) => value).join(" ")]];
};

export const cssDeclarations = (style: Style, url: ImageUrl): Declaration[] =>
  withJoinedFilters(KEYS.flatMap((key) => declarationsOf(style, key, url)));

export const cssText = (style: Style, url: ImageUrl): string =>
  cssDeclarations(style, url)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
