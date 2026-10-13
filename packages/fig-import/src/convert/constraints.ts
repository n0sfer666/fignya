import type { Constraint, Constraints } from "@fignya/model";
import { str, type Rec } from "../fig/guards";

const CONSTRAINTS: Readonly<Record<string, Constraint>> = {
  MIN: "min",
  FIXED_MIN: "min",
  CENTER: "center",
  MAX: "max",
  FIXED_MAX: "max",
  STRETCH: "stretch",
  SCALE: "scale",
};

const constraintOf = (raw: Rec, field: string): Constraint => CONSTRAINTS[str(raw, field) ?? ""] ?? "min";

export const constraintsOf = (raw: Rec): { constraints?: Constraints } => {
  const constraints: Constraints = [constraintOf(raw, "horizontalConstraint"), constraintOf(raw, "verticalConstraint")];
  return constraints[0] === "min" && constraints[1] === "min" ? {} : { constraints };
};
