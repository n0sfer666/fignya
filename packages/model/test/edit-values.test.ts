import { describe, expect, it } from "vitest";
import { editValues, STYLE_INPUTS } from "../src";

describe("editValues", () => {
  it("formats editable values as CSS strings the parsers accept", () => {
    const values = editValues({
      left: 8,
      width: 120.5,
      opacity: 0.5,
      background: [{ kind: "solid", color: { r: 255, g: 102, b: 0, a: 1 } }],
      padding: [8, 16, 8, 16],
      borderRadius: "50%",
      fontWeight: 600,
      display: "flex",
    });
    expect(values).toEqual({ left: "8px", width: "120.5px", opacity: "0.5", background: "rgba(255,102,0,1)", padding: "8px 16px 8px 16px", borderRadius: "50%", fontWeight: "600" });
    expect(STYLE_INPUTS.background(values.background ?? "")).toEqual({ background: [{ kind: "solid", color: { r: 255, g: 102, b: 0, a: 1 } }] });
    expect(STYLE_INPUTS.padding(values.padding ?? "")).toEqual({ padding: [8, 16, 8, 16] });
  });

  it("skips gradients and absent values", () => {
    expect(editValues({ background: [] })).toEqual({});
  });
});
