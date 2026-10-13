import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const filesOf = (path: string): string[] =>
  statSync(path).isDirectory() ? readdirSync(path, { recursive: true, encoding: "utf8" }).map((name) => join(path, name)) : [path];

export const sourceHash = (root: string, paths: string[]): string => {
  const hash = createHash("sha1");
  const files = paths
    .flatMap((path) => filesOf(join(root, path)))
    .filter((file) => statSync(file).isFile())
    .sort();
  for (const file of files) hash.update(relative(root, file)).update(readFileSync(file));
  return hash.digest("hex").slice(0, 12);
};
