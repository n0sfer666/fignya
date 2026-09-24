import { describe, expect, it } from "vitest";
import { boxStyle, containerStyle } from "../src/convert/layout";
import { box } from "./fixtures";

const row = { stackMode: "HORIZONTAL" };
const column = { stackMode: "VERTICAL" };

describe("containerStyle", () => {
  it("is empty without auto layout", () => {
    expect(containerStyle({})).toEqual({});
  });

  it("maps auto layout to flex", () => {
    expect(
      containerStyle({
        stackMode: "VERTICAL",
        stackSpacing: 8,
        stackHorizontalPadding: 16,
        stackVerticalPadding: 4,
        stackPaddingRight: 12,
        stackPrimaryAlignItems: "SPACE_BETWEEN",
        stackCounterAlignItems: "CENTER",
        stackWrap: "WRAP",
      }),
    ).toEqual({
      display: "flex",
      flexDirection: "column",
      flexWrap: "wrap",
      gap: 8,
      padding: [4, 12, 4, 16],
      justifyContent: "space-between",
      alignItems: "center",
    });
  });

  it("clamps negative spacing and defaults alignment", () => {
    expect(containerStyle({ ...row, stackSpacing: -4 })).toEqual({
      display: "flex",
      flexDirection: "row",
      gap: 0,
      padding: [0, 0, 0, 0],
      justifyContent: "flex-start",
      alignItems: "flex-start",
    });
  });
});

describe("boxStyle", () => {
  it("positions absolutely outside auto layout", () => {
    expect(boxStyle(box(10, 20, 100, 50), undefined)).toEqual({ position: "absolute", left: 10, top: 20, width: 100, height: 50 });
  });

  it("positions absolutely when child opts out of flow", () => {
    expect(boxStyle({ ...box(1, 2, 3, 4), stackPositioning: "ABSOLUTE" }, row)).toMatchObject({ position: "absolute", left: 1 });
  });

  it("keeps rotation as matrix", () => {
    const raw = { transform: { m00: 0, m01: -1, m02: 5, m10: 1, m11: 0, m12: 6 }, size: { x: 10, y: 20 } };
    expect(boxStyle(raw, undefined).transform).toEqual([0, 1, -1, 0]);
  });

  it("sizes fixed flow child along both axes", () => {
    expect(boxStyle(box(0, 0, 100, 50), row)).toEqual({ position: "relative", flexShrink: 0, width: 100, height: 50 });
  });

  it("grows and stretches flow child", () => {
    const raw = { ...box(0, 0, 100, 50), stackChildPrimaryGrow: 1, stackChildAlignSelf: "STRETCH" };
    expect(boxStyle(raw, column)).toEqual({ position: "relative", flexShrink: 0, flexGrow: 1, minHeight: 0, alignSelf: "stretch" });
  });
});
