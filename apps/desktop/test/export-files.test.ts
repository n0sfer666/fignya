import { describe, expect, it } from "vitest";
import { exportFiles, type ExportSources } from "../main/export-files";
import type { StoredFace } from "../shared/fonts";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]);

const FONT = new Uint8Array([7]);

const faces: StoredFace[] = [
  { family: "Inter", weight: 400, italic: false, file: "0123456789abcdef.woff2" },
  { family: "Roboto", weight: 700, italic: true, file: "fedcba9876543210.woff2" },
];

const sources: ExportSources = {
  image: async (hash) => (hash === "ab" ? PNG : undefined),
  faces: async () => faces,
  font: async (file) => (file === faces[0]?.file ? FONT : undefined),
};

const bundle = { screenId: "1:2", html: "<html></html>", css: ".n1{}", images: ["ab", "gone"], families: ["Inter", "YS Text"] };

const text = (data: Uint8Array | string | undefined): string | undefined => (typeof data === "string" ? data : undefined);

describe("exportFiles", () => {
  it("writes the page, its images and the downloaded faces of its families", async () => {
    const files = new Map((await exportFiles(bundle, sources)).map((f) => [f.path, f.data]));
    expect([...files.keys()].sort()).toEqual(["fonts/0123456789abcdef.woff2", "images/ab.png", "index.html", "styles.css"]);
    expect(files.get("index.html")).toBe("<html></html>");
    expect(files.get("images/ab.png")).toBe(PNG);
    expect(files.get("fonts/0123456789abcdef.woff2")).toBe(FONT);
  });

  it("declares the copied faces before the page styles", async () => {
    const css = text((await exportFiles(bundle, sources)).find((f) => f.path === "styles.css")?.data);
    expect(css).toBe("@font-face{font-family:'Inter';font-style:normal;font-weight:400;src:url('fonts/0123456789abcdef.woff2');font-display:block}\n.n1{}");
  });

  it("skips faces whose file is gone", async () => {
    const files = await exportFiles({ ...bundle, families: ["Roboto"] }, sources);
    expect(files.map((f) => f.path).sort()).toEqual(["images/ab.png", "index.html", "styles.css"]);
    expect(text(files.find((f) => f.path === "styles.css")?.data)).toBe(".n1{}");
  });

  it("copies a file shared by several faces once and declares every face", async () => {
    const shared: StoredFace[] = [
      { family: "Inter", weight: 400, italic: false, file: "0123456789abcdef.woff2" },
      { family: "Inter", weight: 700, italic: false, file: "0123456789abcdef.woff2" },
    ];
    const reads: string[] = [];
    const files = await exportFiles({ ...bundle, images: ["ab", "ab"], families: ["Inter"] }, { ...sources, faces: async () => shared, font: async (file) => (reads.push(file), FONT) });
    expect(files.map((f) => f.path).sort()).toEqual(["fonts/0123456789abcdef.woff2", "images/ab.png", "index.html", "styles.css"]);
    expect(reads).toEqual(["0123456789abcdef.woff2"]);
    expect(text(files.find((f) => f.path === "styles.css")?.data)?.match(/@font-face/g)).toHaveLength(2);
  });
});
