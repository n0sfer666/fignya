import { bool, rec, type Rec } from "../fig/guards";
import type { ComponentKeys } from "../tree/component-keys";
import { guidKey, type FigNode } from "../tree/node-index";
import { withCharacters } from "./text-data";

export type PropField = { node: FigNode; fields: Rec };

type Values = { variable: Rec; legacy: Rec };

const FIELDS: Readonly<Record<string, (values: Values) => Rec | undefined>> = {
  VISIBLE: ({ variable, legacy }) => {
    const visible = bool(variable, "boolValue") ?? bool(legacy, "boolValue");
    return visible === undefined ? undefined : { visible };
  },
  TEXT_DATA: ({ variable, legacy }) => {
    const textData = withCharacters(rec(variable, "textDataValue")) ?? withCharacters(rec(legacy, "textValue"));
    return textData ? { textData } : undefined;
  },
  OVERRIDDEN_SYMBOL_ID: ({ variable, legacy }) => {
    const symbol = rec(rec(variable, "symbolIdValue") ?? {}, "guid") ?? rec(legacy, "guidValue");
    return symbol ? { overriddenSymbolID: symbol } : undefined;
  },
};

const valuesOf = (assignment: Rec): Values => ({
  variable: rec(rec(assignment, "varValue") ?? {}, "value") ?? {},
  legacy: rec(assignment, "value") ?? {},
});

export const propFields = (keys: ComponentKeys, assignments: Rec[]): PropField[] =>
  assignments.flatMap((assignment) => {
    const refs = keys.refs.get(guidKey(rec(assignment, "defID")));
    if (!refs) return [];
    const values = valuesOf(assignment);
    return refs.flatMap(({ node, field }) => {
      const fields = FIELDS[field]?.(values);
      return fields ? [{ node, fields }] : [];
    });
  });
