import { describe, expect, it } from "vitest";
import { parseNodeQuery } from "../src";

describe("parseNodeQuery", () => {
  it("accepts ids with a colon or a dash", () => {
    expect(parseNodeQuery("2479:25954")).toEqual(["2479:25954"]);
    expect(parseNodeQuery(" 2479-25954 ")).toEqual(["2479:25954"]);
  });

  it("reads node-id from a Figma link", () => {
    expect(parseNodeQuery("https://www.figma.com/design/KEY/ROI-Navigator?node-id=13160-88951&t=abc")).toEqual(["13160:88951"]);
    expect(parseNodeQuery("https://www.figma.com/design/KEY/x?t=1&node-id=I13160-88951%3B456-34051")).toEqual(["13160:88951", "456:34051"]);
  });

  it("splits instance sublayer ids into a chain", () => {
    expect(parseNodeQuery("I13160:88951;456:34051;7:8")).toEqual(["13160:88951", "456:34051", "7:8"]);
  });

  it("rejects anything else", () => {
    expect(parseNodeQuery("")).toBeUndefined();
    expect(parseNodeQuery("Анализ")).toBeUndefined();
    expect(parseNodeQuery("12:")).toBeUndefined();
    expect(parseNodeQuery("1:2;3:4")).toBeUndefined();
    expect(parseNodeQuery("I1:2")).toBeUndefined();
    expect(parseNodeQuery("https://www.figma.com/design/KEY/x")).toBeUndefined();
    expect(parseNodeQuery("https://www.figma.com/design/KEY/x?node-id=%E0%A4%A")).toBeUndefined();
  });
});
