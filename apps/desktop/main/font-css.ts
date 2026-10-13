export type FontSource = { weight: number; italic: boolean; unicodeRange?: string; url: string; format: string };

const BLOCK = /@font-face\s*\{([^}]*)\}/g;
const SRC = /url\((https:\/\/fonts\.gstatic\.com\/[^\s)'"]+)\)\s*format\(['"]?([a-z0-9]+)['"]?\)/;
export const UNICODE_RANGE = /^U\+[0-9A-F?]+(-[0-9A-F]+)?(, ?U\+[0-9A-F?]+(-[0-9A-F]+)?)*$/i;

const property = (body: string, name: string): string | undefined => {
  for (const declaration of body.split(";")) {
    const [key, ...value] = declaration.split(":");
    if (key?.trim() === name) return value.join(":").trim();
  }
  return undefined;
};

const sourceOf = (body: string): FontSource | undefined => {
  const src = SRC.exec(property(body, "src") ?? "");
  const weight = Number(property(body, "font-weight"));
  const range = property(body, "unicode-range");
  if (!src?.[1] || !src[2] || !Number.isInteger(weight) || (range !== undefined && !UNICODE_RANGE.test(range))) return undefined;
  return { weight, italic: property(body, "font-style") === "italic", ...(range ? { unicodeRange: range } : {}), url: src[1], format: src[2] };
};

export const parseFontCss = (css: string): FontSource[] => [...css.matchAll(BLOCK)].flatMap((match) => sourceOf(match[1] ?? "") ?? []);
