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
      gap: 0,
      padding: [4, 12, 0, 16],
      justifyContent: "space-between",
      alignItems: "center",
    });
  });

  it("wraps only horizontal auto layout", () => {
    expect(containerStyle({ ...row, stackWrap: "WRAP" })).toMatchObject({ flexWrap: "wrap" });
    expect(containerStyle({ ...column, stackWrap: "WRAP", stackCounterSpacing: 8 })).not.toHaveProperty("flexWrap");
    expect(containerStyle({ ...column, stackWrap: "WRAP", stackCounterSpacing: 8 })).not.toHaveProperty("rowGap");
  });

  it("spaces wrapped lines by counter spacing and falls back to the main gap", () => {
    const wrap = { ...row, stackSpacing: 16, stackWrap: "WRAP" };
    expect(containerStyle({ ...wrap, stackCounterSpacing: 8 })).toMatchObject({ gap: 16, rowGap: 8 });
    expect(containerStyle({ ...wrap, stackCounterSpacing: null })).not.toHaveProperty("rowGap");
    expect(containerStyle({ ...wrap, stackCounterSpacing: Number.NaN })).not.toHaveProperty("rowGap");
  });

  it("keeps wrapped items apart since overlap would shift the first item of every line", () => {
    expect(containerStyle({ ...row, stackSpacing: -4, stackWrap: "WRAP" })).toMatchObject({ gap: 0, flexWrap: "wrap" });
    expect(containerStyle({ ...row, stackSpacing: -4, stackWrap: "WRAP" })).not.toHaveProperty("rowGap");
  });

  it("stacks the first item on top when auto layout reverses the canvas order", () => {
    expect(containerStyle({ ...row, stackReverseZIndex: true }).stackOrder).toBe("first-on-top");
    expect(containerStyle({ ...row, stackReverseZIndex: false })).not.toHaveProperty("stackOrder");
  });

  it("ignores item spacing when space between distributes items like Figma auto spacing", () => {
    expect(containerStyle({ ...row, stackSpacing: 53, stackPrimaryAlignItems: "SPACE_BETWEEN" }).gap).toBe(0);
  });

  it("maps space evenly to space between like Figma", () => {
    expect(containerStyle({ ...row, stackPrimaryAlignItems: "SPACE_EVENLY" }).justifyContent).toBe("space-between");
  });

  it("reads absent bottom and right padding as zero like Figma", () => {
    expect(containerStyle({ ...row, stackHorizontalPadding: 12, stackVerticalPadding: 12 }).padding).toEqual([12, 0, 0, 12]);
    expect(containerStyle({ ...row, stackHorizontalPadding: 12, stackVerticalPadding: 12, stackPaddingRight: 12, stackPaddingBottom: 12 }).padding).toEqual([12, 12, 12, 12]);
  });

  it("keeps negative spacing for overlapping items and defaults alignment", () => {
    expect(containerStyle({ ...row, stackSpacing: -4 })).toEqual({
      display: "flex",
      flexDirection: "row",
      gap: -4,
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

  it("keeps a flip of a flow child as scale", () => {
    const size = { x: 10, y: 20 };
    const style = boxStyle({ transform: { m00: -1, m01: 0, m02: 10, m10: 0, m11: 1, m12: 0 }, size }, row);
    expect(style.scale).toEqual([-1, 1]);
    expect(style).not.toHaveProperty("centerTransform");
  });

  it("turns a rotated flow child around its center and sizes its slot to the rotated box", () => {
    const size = { x: 10, y: 20 };
    const style = boxStyle({ transform: { m00: 0, m01: -1, m02: 5, m10: 1, m11: 0, m12: 6 }, size }, row);
    expect(style).toMatchObject({ width: 10, height: 20, centerTransform: [0, 1, -1, 0], margin: [-5, 5, -5, 5] });
    expect(style).not.toHaveProperty("scale");
    expect(style).not.toHaveProperty("transform");
  });

  it("sizes the slot of a flow child turned by 45 degrees to its bounding box", () => {
    const c = Math.SQRT1_2;
    const style = boxStyle({ transform: { m00: c, m01: -c, m02: 0, m10: c, m11: c, m12: 0 }, size: { x: 10, y: 10 } }, column);
    expect(style.margin?.map((v) => Number(v.toFixed(3)))).toEqual([2.071, 2.071, 2.071, 2.071]);
  });

  it("makes the box of a turned fill line its slot and keeps the line at its stored size", () => {
    const transform = { m00: 0, m01: -1, m02: 11.9, m10: 1, m11: 0, m12: 215 };
    const style = boxStyle({ transform, size: { x: 215, y: 0 }, stackChildPrimaryGrow: 1 }, row, true);
    const margin = [107.5, 0, 107.5, 0];
    expect(style).toEqual({ position: "relative", flexShrink: 1, flexGrow: 1, flexBasis: 0, minWidth: 0, height: 0, centerTransform: [0, 1, -1, 0], margin, contentSize: [215, 0] });
  });

  it("gives a turned fill line in a column a share of the column even when its turned box is taller", () => {
    const transform = { m00: 0, m01: -1, m02: 0, m10: 1, m11: 0, m12: 0 };
    const style = boxStyle({ transform, size: { x: 215, y: 0 }, stackChildPrimaryGrow: 1 }, column, true);
    expect([style.flexBasis, style.minHeight, style.width, style.margin, style.contentSize]).toEqual([0, 0, 215, [0, -107.5, 0, -107.5], [215, 0]]);
  });

  it("bases a turned fill line in a wrapping row on its turned width", () => {
    const transform = { m00: 0, m01: -1, m02: 0, m10: 1, m11: 0, m12: 0 };
    const style = boxStyle({ transform, size: { x: 10, y: 30 }, stackChildPrimaryGrow: 1 }, { ...row, stackWrap: "WRAP" }, true);
    expect([style.flexBasis, style.margin]).toEqual([30, [-10, 0, -10, 0]]);
  });

  it("keeps the stored box of a turned flow child that is not a vector or that stretches", () => {
    const transform = { m00: 0, m01: -1, m02: 0, m10: 1, m11: 0, m12: 1.2 };
    const fixed = { position: "relative", flexShrink: 0, width: 1, height: 175, centerTransform: [0, 1, -1, 0], margin: [-87, 87, -87, 87] };
    expect(boxStyle({ transform, size: { x: 1, y: 175 }, stackChildPrimaryGrow: 1 }, row)).toEqual(fixed);
    expect(boxStyle({ transform, size: { x: 1, y: 175 }, stackChildAlignSelf: "STRETCH" }, row, true)).toEqual(fixed);
  });

  it("sizes fixed flow child along both axes", () => {
    expect(boxStyle(box(0, 0, 100, 50), row)).toEqual({ position: "relative", flexShrink: 0, width: 100, height: 50 });
  });

  it("grows and stretches flow child", () => {
    const raw = { ...box(0, 0, 100, 50), stackChildPrimaryGrow: 1, stackChildAlignSelf: "STRETCH" };
    expect(boxStyle(raw, column)).toEqual({ position: "relative", flexShrink: 1, flexGrow: 1, flexBasis: 0, minHeight: 0, alignSelf: "stretch" });
  });

  it("fills only the free space of a row, not its content width", () => {
    const raw = { ...box(0, 0, 900, 50), stackChildPrimaryGrow: 1 };
    expect(boxStyle(raw, row)).toMatchObject({ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 });
  });

  it("lets fill children of a wrapping row wrap at their own width", () => {
    const raw = { ...box(0, 0, 240, 50), stackChildPrimaryGrow: 1 };
    const style = boxStyle(raw, { ...row, stackWrap: "WRAP" });
    expect(style).toMatchObject({ flexGrow: 1, flexShrink: 1, flexBasis: 240 });
    expect(style.minWidth).toBeUndefined();
  });
});
