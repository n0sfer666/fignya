import { bool, rec, type Rec } from "../fig/guards";
import type { ComponentKeys } from "../tree/component-keys";
import { guidKey, type FigNode } from "../tree/node-index";
import { withCharacters } from "./text-data";

export type PropField = { node: FigNode; fields: Rec };

const FIELDS: Readonly<Record<string, (value: Rec) => Rec | undefined>> = {
  VISIBLE: (value) => {
    const visible = bool(value, "boolValue");
    return visible === undefined ? undefined : { visible };
  },
  TEXT_DATA: (value) => {
    const textData = withCharacters(rec(value, "textValue"));
    return textData ? { textData } : undefined;
  },
  OVERRIDDEN_SYMBOL_ID: (value) => {
    const symbol = rec(value, "guidValue");
    return symbol ? { overriddenSymbolID: symbol } : undefined;
  },
};

export const propFields = (keys: ComponentKeys, assignments: Rec[]): PropField[] =>
  assignments.flatMap((assignment) => {
    const value = rec(assignment, "value");
    const refs = keys.refs.get(guidKey(rec(assignment, "defID")));
    if (!value || !refs) return [];
    return refs.flatMap(({ node, field }) => {
      const fields = FIELDS[field]?.(value);
      return fields ? [{ node, fields }] : [];
    });
  });
