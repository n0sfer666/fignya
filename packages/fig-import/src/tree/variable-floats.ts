import { rec, recs, str, type Rec } from "../fig/guards";
import type { Resolve } from "./variable-values";
import type { Modes } from "./variable-modes";

const CORNER_FIELDS = ["rectangleTopLeftCornerRadius", "rectangleTopRightCornerRadius", "rectangleBottomRightCornerRadius", "rectangleBottomLeftCornerRadius"];

const UNIFORM_RADIUS = "CORNER_RADIUS";

const FLOAT_FIELDS: ReadonlyMap<string, string> = new Map([
  [UNIFORM_RADIUS, "cornerRadius"],
  ["RECTANGLE_TOP_LEFT_CORNER_RADIUS", "rectangleTopLeftCornerRadius"],
  ["RECTANGLE_TOP_RIGHT_CORNER_RADIUS", "rectangleTopRightCornerRadius"],
  ["RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS", "rectangleBottomRightCornerRadius"],
  ["RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS", "rectangleBottomLeftCornerRadius"],
  ["STACK_SPACING", "stackSpacing"],
  ["STACK_COUNTER_SPACING", "stackCounterSpacing"],
  ["STACK_PADDING_LEFT", "stackHorizontalPadding"],
  ["STACK_PADDING_TOP", "stackVerticalPadding"],
  ["STACK_PADDING_RIGHT", "stackPaddingRight"],
  ["STACK_PADDING_BOTTOM", "stackPaddingBottom"],
  ["FONT_SIZE", "fontSize"],
]);

export const BOUND_FLOAT_FIELDS: readonly string[] = [...FLOAT_FIELDS.values()];

export const bindings = (fields: Rec): Rec[] => recs(rec(fields, "variableConsumptionMap"), "entries");

export const boundField = (entry: Rec): string | undefined => FLOAT_FIELDS.get(str(entry, "variableField") ?? "");

export const bindsFloats = (fields: Rec): boolean => bindings(fields).some((e) => boundField(e) !== undefined);

const isUniform = (entry: Rec): boolean => str(entry, "variableField") === UNIFORM_RADIUS;

const targetsOf = (entry: Rec, bound: ReadonlySet<string>): string[] => {
  const field = boundField(entry);
  if (field === undefined) return [];
  return isUniform(entry) ? [field, ...CORNER_FIELDS.filter((corner) => !bound.has(corner))] : [field];
};

const boundValues = (resolve: Resolve<number>, modes: Modes, fields: Rec, entry: Rec, bound: ReadonlySet<string>): [string, number][] => {
  const alias = rec(rec(rec(entry, "variableData") ?? {}, "value") ?? {}, "alias");
  const value = alias && resolve(modes, alias);
  if (value === undefined) return [];
  return targetsOf(entry, bound).flatMap((field): [string, number][] => (fields[field] === value ? [] : [[field, value]]));
};

export const withFloats = (resolve: Resolve<number>, modes: Modes, fields: Rec): Rec => {
  const entries = bindings(fields);
  const bound = new Set(entries.filter((e) => !isUniform(e)).flatMap((e) => boundField(e) ?? []));
  const patch = entries.flatMap((entry) => boundValues(resolve, modes, fields, entry, bound));
  return patch.length === 0 ? fields : { ...fields, ...Object.fromEntries(patch) };
};
