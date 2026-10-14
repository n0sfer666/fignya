import { describe, expect, it } from "vitest";
import { historyStep, inTextField } from "../../renderer/src/history-step";

const press = (init: KeyboardEventInit): KeyboardEvent => new KeyboardEvent("keydown", init);

describe("historyStep", () => {
  it("maps ⌘Z and ⇧⌘Z, also with Ctrl", () => {
    expect(historyStep(press({ code: "KeyZ", key: "z", metaKey: true }))).toBe("undo");
    expect(historyStep(press({ code: "KeyZ", key: "Z", metaKey: true, shiftKey: true }))).toBe("redo");
    expect(historyStep(press({ code: "KeyZ", key: "z", ctrlKey: true }))).toBe("undo");
  });

  it("follows the letter on Latin layouts and the physical key on others", () => {
    expect(historyStep(press({ code: "KeyW", key: "z", metaKey: true }))).toBe("undo");
    expect(historyStep(press({ code: "KeyZ", key: "w", metaKey: true }))).toBeUndefined();
    expect(historyStep(press({ code: "KeyZ", key: "я", metaKey: true }))).toBe("undo");
  });

  it("ignores other keys and plain Z", () => {
    expect(historyStep(press({ code: "KeyZ", key: "z" }))).toBeUndefined();
    expect(historyStep(press({ code: "KeyY", key: "y", metaKey: true }))).toBeUndefined();
    expect(historyStep(press({ code: "KeyZ", key: "z", metaKey: true, altKey: true }))).toBeUndefined();
  });
});

describe("inTextField", () => {
  it("tells text fields from the rest of the page", () => {
    const input = document.body.appendChild(document.createElement("input"));
    const area = document.body.appendChild(document.createElement("textarea"));
    expect(inTextField(input)).toBe(true);
    expect(inTextField(area)).toBe(true);
    expect(inTextField(document.body)).toBe(false);
    expect(inTextField(null)).toBe(false);
  });
});
