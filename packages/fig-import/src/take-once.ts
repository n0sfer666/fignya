export const takeOnce = <T>(value: T): (() => T) => {
  let held: { value: T } | undefined = { value };
  return () => {
    if (!held) throw new Error("value already taken");
    const taken = held.value;
    held = undefined;
    return taken;
  };
};
