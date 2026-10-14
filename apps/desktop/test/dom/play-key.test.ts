import { describe, expect, it } from "vitest";
import { isPlayShortcut, playKey } from "../../renderer/src/play/play-key";

const key = (init: KeyboardEventInit): KeyboardEvent => new KeyboardEvent("keydown", init);

describe("isPlayShortcut", () => {
  it("accepts Option-Command-Return and Alt-Control-Enter", () => {
    expect(isPlayShortcut(key({ key: "Enter", altKey: true, metaKey: true }))).toBe(true);
    expect(isPlayShortcut(key({ key: "Enter", altKey: true, ctrlKey: true }))).toBe(true);
  });

  it("rejects other combinations", () => {
    expect(isPlayShortcut(key({ key: "Enter", metaKey: true }))).toBe(false);
    expect(isPlayShortcut(key({ key: "Enter", altKey: true }))).toBe(false);
    expect(isPlayShortcut(key({ key: "Enter", altKey: true, metaKey: true, shiftKey: true }))).toBe(false);
    expect(isPlayShortcut(key({ key: "e", altKey: true, metaKey: true }))).toBe(false);
  });
});

describe("playKey", () => {
  it("exits on Escape and goes back on Left and Backspace", () => {
    expect(playKey(key({ key: "Escape" }))).toBe("exit");
    expect(playKey(key({ key: "ArrowLeft" }))).toBe("back");
    expect(playKey(key({ key: "Backspace" }))).toBe("back");
  });

  it("leaves modified and other keys alone", () => {
    expect(playKey(key({ key: "ArrowLeft", metaKey: true }))).toBeUndefined();
    expect(playKey(key({ key: "Backspace", altKey: true }))).toBeUndefined();
    expect(playKey(key({ key: "ArrowRight" }))).toBeUndefined();
  });
});
