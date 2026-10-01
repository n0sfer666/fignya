import type { FontFaceUse } from "@fignya/fig-import";
import type { FontDownload, FontRequest } from "../shared/fonts";
import { parseFontCss, type FontSource } from "./font-css";
import { mapLimited } from "./map-limited";

export type Fetcher = (url: string) => Promise<Response>;

export type FetchedFace = FontSource & { family: string; bytes: Uint8Array };

export type FamilyDownload = { result: FontDownload; faces: FetchedFace[] };

const CSS_API = "https://fonts.googleapis.com/css2";

const UNKNOWN_FACE = 400;

const FETCH_LIMIT = 8;

const uniqueBy = <TItem>(items: readonly TItem[], key: (item: TItem) => string): TItem[] => [...new Map(items.map((item) => [key(item), item])).values()];

export const cssUrl = (family: string, face: FontFaceUse): string =>
  `${CSS_API}?family=${encodeURIComponent(family).replaceAll("%20", "+")}:ital,wght@${face.italic ? 1 : 0},${face.weight}`;

const faceCss = async (fetcher: Fetcher, family: string, face: FontFaceUse): Promise<string | undefined> => {
  const response = await fetcher(cssUrl(family, face));
  if (response.status === UNKNOWN_FACE) return undefined;
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${family}`);
  return response.text();
};

const bytesOf = async (fetcher: Fetcher, url: string): Promise<Uint8Array> => {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return new Uint8Array(await response.arrayBuffer());
};

export const downloadFamily = async (fetcher: Fetcher, { family, faces }: FontRequest): Promise<FamilyDownload> => {
  const wanted = uniqueBy(faces, (face) => `${face.weight}:${face.italic}`);
  try {
    const answers = await mapLimited(wanted, FETCH_LIMIT, (face) => faceCss(fetcher, family, face));
    const missingFaces = answers.filter((css) => css === undefined).length;
    const sources = uniqueBy(answers.flatMap((css) => (css === undefined ? [] : parseFontCss(css))), (source) => source.url);
    if (sources.length === 0) return { result: { family, status: "unavailable", missingFaces }, faces: [] };
    const fetched = await mapLimited(sources, FETCH_LIMIT, async (source) => ({ ...source, family, bytes: await bytesOf(fetcher, source.url) }));
    return { result: { family, status: "downloaded", missingFaces }, faces: fetched };
  } catch (error) {
    console.error(`fignya: font ${family} download failed: ${String(error)}`);
    return { result: { family, status: "failed", missingFaces: wanted.length }, faces: [] };
  }
};
