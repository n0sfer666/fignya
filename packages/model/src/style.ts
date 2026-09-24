import type { Color } from "./color";

export type Px = number;

export type Sides = readonly [Px, Px, Px, Px];

export type Matrix2 = readonly [number, number, number, number];

export type Shadow = { inset: boolean; x: Px; y: Px; blur: Px; spread: Px; color: Color };

export type ColorStop = { color: Color; position: number };

export type ImageFit = "cover" | "contain" | "tile" | "stretch";

export type Paint =
  | { kind: "solid"; color: Color }
  | { kind: "linear"; angle: number; stops: ColorStop[] }
  | { kind: "radial"; stops: ColorStop[] }
  | { kind: "image"; hash: string; fit: ImageFit };

export type FlexAlign = "flex-start" | "center" | "flex-end";

export type TextAlign = "left" | "center" | "right" | "justify";

export type LetterSpacing = { value: number; unit: "px" | "em" };

export type StyleValues = {
  position: "relative" | "absolute";
  left: Px;
  top: Px;
  width: Px;
  height: Px;
  minWidth: Px;
  minHeight: Px;
  transform: Matrix2;
  display: "flex";
  flexDirection: "row" | "column";
  flexWrap: "wrap";
  gap: Px;
  padding: Sides;
  justifyContent: FlexAlign | "space-between";
  alignItems: FlexAlign | "baseline";
  alignSelf: "stretch";
  flexGrow: number;
  flexShrink: number;
  borderRadius: Sides | "50%";
  outline: { width: Px; color: Color };
  boxShadow: Shadow[];
  filterBlur: Px;
  backdropBlur: Px;
  opacity: number;
  overflow: "hidden";
  background: Paint[];
  color: Color;
  fontFamily: string;
  fontSize: Px;
  fontWeight: number;
  fontStyle: "italic";
  lineHeight: Px | "normal";
  letterSpacing: LetterSpacing;
  textAlign: TextAlign;
  whiteSpace: "pre-wrap";
  overflowWrap: "break-word";
};

export type Style = Partial<StyleValues>;
