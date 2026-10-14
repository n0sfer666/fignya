import { describe, expect, it, vi } from "vitest";
import { guardClose, type CloseChoice, type ClosableWindow } from "../main/close-guard";

const fakeWindow = () => {
  let listener: (event: { preventDefault: () => void }) => void = () => undefined;
  const closes: boolean[] = [];
  const window: ClosableWindow = {
    on: (_name, next) => {
      listener = next;
    },
    close: () => {
      const event = { prevented: false, preventDefault: () => (event.prevented = true) };
      listener(event);
      closes.push(!event.prevented);
    },
  };
  return { window, closes };
};

const setup = (choice: CloseChoice, dirty = true, saving?: () => Promise<void>) => {
  const { window, closes } = fakeWindow();
  const state = { dirty };
  const save = vi.fn(
    saving ??
      (async () => {
        state.dirty = false;
      }),
  );
  const ask = vi.fn(async () => choice);
  const failed = vi.fn();
  guardClose(window, { dirty: () => state.dirty, save }, ask, failed);
  return { window, closes, ask, failed, save };
};

describe("guardClose", () => {
  it("closes a clean window without asking", () => {
    const { window, closes, ask } = setup("cancel", false);
    window.close();
    expect(closes).toEqual([true]);
    expect(ask).not.toHaveBeenCalled();
  });

  it("keeps a dirty window open on cancel", async () => {
    const { window, closes, ask } = setup("cancel");
    window.close();
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(closes).toEqual([false]);
  });

  it("closes without saving on discard", async () => {
    const { window, closes, save } = setup("discard");
    window.close();
    await vi.waitFor(() => expect(closes).toEqual([false, true]));
    expect(save).not.toHaveBeenCalled();
  });

  it("saves and then closes", async () => {
    const { window, closes, save } = setup("save");
    window.close();
    await vi.waitFor(() => expect(closes).toEqual([false, true]));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("stays open when the document is still dirty after saving", async () => {
    const { window, closes, save } = setup("save", true, async () => undefined);
    window.close();
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(closes).toEqual([false]);
  });

  it("stays open and reports when saving fails", async () => {
    const error = new Error("disk full");
    const { window, closes, failed } = setup("save", true, async () => Promise.reject(error));
    window.close();
    await vi.waitFor(() => expect(failed).toHaveBeenCalledWith(error));
    expect(closes).toEqual([false]);
  });

  it("asks once while the question is open", async () => {
    const { window, closes, ask } = setup("cancel");
    window.close();
    window.close();
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(1));
    expect(closes).toEqual([false, false]);
  });
});
