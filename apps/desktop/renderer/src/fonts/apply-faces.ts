import { fontFaceRule } from "../../../shared/font-face-css";
import type { FontFaces } from "../../../shared/fonts";

const applied = new Set<string>();

export const applyFaces = ({ faces }: FontFaces): void => {
  const fresh = faces.map(fontFaceRule).filter((rule) => !applied.has(rule));
  if (fresh.length === 0) return;
  for (const rule of fresh) applied.add(rule);
  const style = document.createElement("style");
  style.className = "fignya-fonts";
  style.textContent = fresh.join("\n");
  document.head.append(style);
};
