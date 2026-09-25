import { mergeOverride, pathKey, type DesignNode, type Override } from "@fignya/model";

export type OverrideScope = ReadonlyMap<string, Override>;

export const EMPTY_SCOPE: OverrideScope = new Map();

export const nestedScope = (outer: OverrideScope, instance: DesignNode): OverrideScope => {
  const own = instance.kind === "instance" ? instance.overrides : [];
  const scope = new Map(own.map((o) => [pathKey(o.path), o]));
  for (const o of outer.values()) {
    const [head, ...rest] = o.path;
    if (head !== instance.id || rest.length === 0) continue;
    const key = pathKey(rest);
    scope.set(key, mergeOverride(scope.get(key), { ...o, path: rest }));
  }
  return scope;
};
