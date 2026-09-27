import type { DesignNode, Style, VectorPath } from "@fignya/model";
import { same, sizeOf, type Size } from "./constrain";

const sameGeometry = (paths: VectorPath[], base: VectorPath[]): boolean =>
  paths.length === base.length && paths.every((path, index) => path.d === base[index]?.d);

const hasOwnGeometry = (stored: DesignNode, paths: VectorPath[] | undefined): boolean =>
  paths !== undefined && stored.kind === "vector" && !sameGeometry(paths, stored.paths);

export const viewBoxOf = (stored: DesignNode, final: Style, paths: VectorPath[] | undefined): Size | undefined => {
  const from = sizeOf(stored.style);
  const size = sizeOf(final);
  if (!from || !size || from[0] <= 0 || from[1] <= 0 || same(from, size)) return undefined;
  return hasOwnGeometry(stored, paths) ? undefined : from;
};
