import { rec, str, type Rec } from "../fig/guards";
import { bindings, boundAlias } from "./variable-bindings";
import type { Resolve } from "./variable-values";
import type { Modes } from "./variable-modes";

const TEXT_FIELD = "TEXT_DATA";

const isText = (entry: Rec): boolean => str(entry, "variableField") === TEXT_FIELD;

export const bindsText = (fields: Rec): boolean => bindings(fields).some(isText);

export const withText = (resolve: Resolve<string>, modes: Modes, fields: Rec): Rec => {
  const entry = bindings(fields).find(isText);
  const alias = entry && boundAlias(entry);
  const characters = alias && resolve(modes, alias);
  const textData = rec(fields, "textData") ?? {};
  if (characters === undefined || str(textData, "characters") === characters) return fields;
  return { ...fields, textData: { ...textData, characters } };
};
