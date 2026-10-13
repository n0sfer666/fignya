import { quoted } from "@fignya/model";

export type Measure = (font: string) => number;

const SIZE = "72px";
const GENERICS = ["monospace", "serif"];

export const isInstalled = (family: string, measure: Measure): boolean =>
  GENERICS.some((generic) => measure(`${SIZE} ${quoted(family)},${generic}`) !== measure(`${SIZE} ${generic}`));
