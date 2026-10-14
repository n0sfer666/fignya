export const hitNode = (path: readonly EventTarget[], root: ShadowRoot): Element | undefined => {
  const inner = path.find((target): target is Element => target instanceof Element && target.getRootNode() === root);
  return inner?.closest("[data-id]") ?? undefined;
};
