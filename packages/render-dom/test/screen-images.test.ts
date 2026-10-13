import { describe, expect, it } from "vitest";
import type { Paint } from "@fignya/model";
import { screenImages } from "../src";
import { frame, modelOf } from "./nodes";

const image = (hash: string): Paint[] => [{ kind: "image", hash, fit: "cover" }];

describe("screenImages", () => {
  it("lists each image the rendered screen uses once", () => {
    const model = modelOf("s", [frame("s", ["a", "b"], { background: image("bg") }), frame("a", [], { background: image("bg") }), frame("b", [], { background: image("b") })]);
    expect(screenImages(model)).toEqual(["bg", "b"]);
  });

  it("skips images of nodes outside the rendered tree", () => {
    const model = modelOf("s", [frame("s", [], { background: image("bg") }), frame("orphan", [], { background: image("unused") })]);
    expect(screenImages(model)).toEqual(["bg"]);
  });
});
