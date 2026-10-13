import { rec, recs, type Rec } from "../fig/guards";

export const bindings = (fields: Rec): Rec[] => recs(rec(fields, "variableConsumptionMap"), "entries");

export const boundAlias = (entry: Rec): Rec | undefined => rec(rec(rec(entry, "variableData") ?? {}, "value") ?? {}, "alias");
