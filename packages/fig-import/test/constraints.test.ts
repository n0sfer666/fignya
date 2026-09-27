import { describe, expect, it } from "vitest";
import { constraintsOf } from "../src/convert/constraints";

describe("constraintsOf", () => {
  it("omits the default left and top constraints", () => {
    expect(constraintsOf({})).toEqual({});
    expect(constraintsOf({ horizontalConstraint: "MIN", verticalConstraint: "FIXED_MIN" })).toEqual({});
  });

  it("maps Figma constraints per axis", () => {
    expect(constraintsOf({ horizontalConstraint: "SCALE", verticalConstraint: "SCALE" })).toEqual({ constraints: ["scale", "scale"] });
    expect(constraintsOf({ horizontalConstraint: "STRETCH", verticalConstraint: "CENTER" })).toEqual({ constraints: ["stretch", "center"] });
    expect(constraintsOf({ verticalConstraint: "FIXED_MAX" })).toEqual({ constraints: ["min", "max"] });
  });
});
