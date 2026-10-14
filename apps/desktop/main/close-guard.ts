export type CloseChoice = "save" | "discard" | "cancel";

export type ClosableWindow = {
  on: (name: "close", listener: (event: { preventDefault: () => void }) => void) => void;
  close: () => void;
};

type SavableDocument = { dirty: () => boolean; save: () => Promise<void> };

export const guardClose = (window: ClosableWindow, doc: SavableDocument, ask: () => Promise<CloseChoice>, failed: (error: unknown) => void): void => {
  let asking = false;
  let leaving = false;
  const decide = async (): Promise<void> => {
    const choice = await ask();
    if (choice === "cancel") return;
    if (choice === "save") {
      await doc.save();
      if (doc.dirty()) return;
    }
    leaving = true;
    window.close();
  };
  window.on("close", (event) => {
    if (leaving || !doc.dirty()) return;
    event.preventDefault();
    if (asking) return;
    asking = true;
    decide()
      .catch(failed)
      .finally(() => {
        asking = false;
      });
  });
};
