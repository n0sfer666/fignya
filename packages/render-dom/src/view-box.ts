import type { DesignNode, Style, VectorPath } from "@fignya/model";
import { same, sizeOf, type Size } from "./constrain";

const shapes = (paths: VectorPath[]): string[] => [...new Set(paths.map((path) => path.d))].sort();

const sameGeometry = (paths: VectorPath[], base: VectorPath[]): boolean => {
  const own = shapes(paths);
  const stored = shapes(base);
  return own.length === stored.length && own.every((d, index) => d === stored[index]);
};

const hasOwnGeometry = (stored: DesignNode, paths: VectorPath[] | undefined): boolean =>
  paths !== undefined && stored.kind === "vector" && !sameGeometry(paths, stored.paths);

export const viewBoxOf = (stored: DesignNode, final: Style, paths: VectorPath[] | undefined): Size | undefined => {
  const from = sizeOf(stored.style);
  const size = sizeOf(final);
  if (!from || !size || from[0] <= 0 || from[1] <= 0 || same(from, size)) return undefined;
  return hasOwnGeometry(stored, paths) ? undefined : from;
};
