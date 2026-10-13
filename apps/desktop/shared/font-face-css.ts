import { quoted } from "@fignya/model";
import type { StoredFace } from "./fonts";
import { fontUrl } from "./urls";

export const fontFaceRule = (face: StoredFace): string =>
  [
    `@font-face{font-family:${quoted(face.family)}`,
    `font-style:${face.italic ? "italic" : "normal"}`,
    `font-weight:${face.weight}`,
    `src:url(${quoted(fontUrl(face.file))})`,
    ...(face.unicodeRange ? [`unicode-range:${face.unicodeRange}`] : []),
    "font-display:block}",
  ].join(";");
