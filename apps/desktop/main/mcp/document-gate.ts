export const documentGate = <TDocument>(loaded: Promise<TDocument>): (() => Promise<TDocument>) => {
  let doc: TDocument | undefined;
  let failed = false;
  loaded.then(
    (opened) => {
      doc = opened;
    },
    () => {
      failed = true;
    },
  );
  return async () => {
    if (doc) return doc;
    throw new Error(failed ? "no document is open" : "the document is still importing, retry later");
  };
};
