import { describe, expect, it } from "vitest";
import { inFocus, onPage, type ThumbTag } from "../main/thumb-tags";

const wide = { id: "1:1", name: "wide", x: 0, y: 0, width: 1440, height: 900 };
const tall = { id: "1:2", name: "tall", x: 0, y: 0, width: 1440, height: 4096 };
const tag = (screen: ThumbTag["screen"], tier: number, page = "p"): ThumbTag => ({ page, screen, tier });

describe("thumbnail tags", () => {
  it("keeps tags of the shown page", () => {
    expect(onPage("p")(tag(wide, 0.5))).toBe(true);
    expect(onPage("q")(tag(wide, 0.5))).toBe(false);
  });

  it("prefers base and the wanted tier of focused screens only", () => {
    const focused = inFocus({ tier: 2, screenIds: [wide.id] });
    expect(focused(tag(wide, 0.5))).toBe(true);
    expect(focused(tag(wide, 2))).toBe(true);
    expect(focused(tag(wide, 1))).toBe(false);
    expect(focused(tag(tall, 0.5))).toBe(false);
  });

  it("matches the capped tier of a screen that hits the size limit", () => {
    const focused = inFocus({ tier: 2, screenIds: [tall.id] });
    expect(focused(tag(tall, 1))).toBe(true);
    expect(focused(tag(tall, 2))).toBe(false);
  });
});
