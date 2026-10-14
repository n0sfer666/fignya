import { exportImagePath, type ScreenExport } from "../shared/export";
import { fontFaceRule } from "../shared/font-face-css";
import type { StoredFace } from "../shared/fonts";
import { imageFile } from "./export-image-file";
import { mapLimited } from "./map-limited";

export type ExportFile = { path: string; data: Uint8Array | string };

export type ExportSources = {
  image: (hash: string) => Promise<Uint8Array | undefined>;
  faces: () => Promise<StoredFace[]>;
  font: (file: string) => Promise<Uint8Array | undefined>;
};

export const READ_LIMIT = 4;

const fontPath = (file: string): string => `fonts/${file}`;

const imageFiles = async (hashes: string[], image: ExportSources["image"]): Promise<ExportFile[]> => {
  const read = await mapLimited([...new Set(hashes)], READ_LIMIT, async (hash) => ({ hash, data: await image(hash) }));
  return read.flatMap(({ hash, data }) => (data ? [{ path: exportImagePath(imageFile(hash, data)), data }] : []));
};

const fontFiles = async (families: string[], sources: ExportSources): Promise<{ faces: StoredFace[]; files: ExportFile[] }> => {
  const wanted = new Set(families);
  const faces = (await sources.faces()).filter((face) => wanted.has(face.family));
  const read = await mapLimited([...new Set(faces.map((face) => face.file))], READ_LIMIT, async (file) => ({ file, data: await sources.font(file) }));
  const files = read.flatMap(({ file, data }) => (data ? [{ path: fontPath(file), data }] : []));
  const found = new Set(files.map((file) => file.path));
  return { faces: faces.filter((face) => found.has(fontPath(face.file))), files };
};

export const exportFiles = async (bundle: ScreenExport, sources: ExportSources): Promise<ExportFile[]> => {
  const [images, fonts] = await Promise.all([imageFiles(bundle.images, sources.image), fontFiles(bundle.families, sources)]);
  const css = [...fonts.faces.map((face) => fontFaceRule(face, fontPath)), bundle.css].join("\n");
  return [{ path: "index.html", data: bundle.html }, { path: "styles.css", data: css }, ...images, ...fonts.files];
};
