import { sameValue, type VectorPath } from "@fignya/model";

const TOLERANCE = 0.025;
const NUMBER = /-?\d+(?:\.\d+)?/g;

const closeNumbers = (a: string, b: string): boolean => {
  const xs = a.match(NUMBER) ?? [];
  const ys = b.match(NUMBER) ?? [];
  return xs.length === ys.length && xs.every((x, i) => Math.abs(Number(x) - Number(ys[i])) <= TOLERANCE);
};

const sameShape = (a: string, b: string): boolean => a === b || (a.replace(NUMBER, "") === b.replace(NUMBER, "") && closeNumbers(a, b));

const samePath = (a: VectorPath, b: VectorPath | undefined): boolean =>
  b !== undefined && a.rule === b.rule && sameValue(a.fill, b.fill) && sameShape(a.d, b.d);

export const samePaths = (a: readonly VectorPath[], b: readonly VectorPath[] | undefined): boolean =>
  b !== undefined && a.length === b.length && a.every((path, i) => samePath(path, b[i]));
