import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FamilyFace } from "../shared/fonts";
import type { FaceCheck } from "./google-fonts";
import { writeAtomic } from "./write-atomic";

export type UnavailableFonts = {
  faces: () => FamilyFace[];
  record: (checks: FaceCheck[]) => Promise<void>;
};

export const RECHECK_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

const FILE = "unavailable.json";

type Checked = [family: string, weight: number, italic: boolean, checkedAt: number];

const isChecked = (value: unknown): value is Checked =>
  Array.isArray(value) &&
  value.length === 4 &&
  typeof value[0] === "string" &&
  Number.isInteger(value[1]) &&
  typeof value[2] === "boolean" &&
  typeof value[3] === "number" &&
  Number.isFinite(value[3]);

const parseChecked = (text: string): Checked[] => {
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value) ? value.filter(isChecked) : [];
  } catch {
    return [];
  }
};

const keyOf = (face: FamilyFace): string => `${face.family}\n${face.weight}\n${face.italic}`;

const entryOf = (checked: Checked): [string, Checked] => [keyOf({ family: checked[0], weight: checked[1], italic: checked[2] }), checked];

const fresh = (checked: Checked, at: number): boolean => {
  const age = at - checked[3];
  return age >= 0 && age < RECHECK_AFTER_MS;
};

export const openUnavailableFonts = async (dir: string, now: () => number): Promise<UnavailableFonts> => {
  const path = join(dir, FILE);
  let state = new Map(parseChecked(await readFile(path, "utf8").catch(() => "")).map(entryOf));
  return {
    faces: () => {
      const at = now();
      return [...state.values()].filter((checked) => fresh(checked, at)).map(([family, weight, italic]) => ({ family, weight, italic }));
    },
    record: async (checks) => {
      const at = now();
      const next = new Map(state);
      for (const check of checks) {
        if (check.present) next.delete(keyOf(check));
        else next.set(keyOf(check), [check.family, check.weight, check.italic, at]);
      }
      for (const [key, checked] of next) if (!fresh(checked, at)) next.delete(key);
      const text = JSON.stringify([...next.values()]);
      if (text === JSON.stringify([...state.values()])) return;
      await mkdir(dir, { recursive: true });
      await writeAtomic(path, text);
      state = next;
    },
  };
};
