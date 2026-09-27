const densityQuery = (): MediaQueryList => window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);

export const watchDensity = (onChange: () => void): (() => void) => {
  let query = densityQuery();
  const changed = (): void => {
    query.removeEventListener("change", changed);
    query = densityQuery();
    query.addEventListener("change", changed);
    onChange();
  };
  query.addEventListener("change", changed);
  window.addEventListener("resize", onChange);
  return () => {
    query.removeEventListener("change", changed);
    window.removeEventListener("resize", onChange);
  };
};
