import { app, BrowserWindow } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pageUrl, registerScheme, serveDist } from "./protocol";

type Thumb = { id: string; w: number; h: number };

const dist = process.env.DIST_DIR ?? join(__dirname, "..", "dist");
const SCALE = 0.25;
const waiters = new Map<string, () => void>();

const parseThumbs = (): Thumb[] => {
  const data: unknown = JSON.parse(readFileSync(join(dist, "thumbs.json"), "utf8"));
  if (!Array.isArray(data)) throw new Error("thumbs.json is not an array");
  return data.flatMap((t: unknown) =>
    typeof t === "object" && t !== null && "id" in t && "w" in t && "h" in t && typeof t.id === "string" && typeof t.w === "number" && typeof t.h === "number"
      ? [{ id: t.id, w: t.w, h: t.h }]
      : [],
  );
};

const capture = async (thumb: Thumb): Promise<void> => {
  const width = Math.ceil(thumb.w * SCALE);
  const height = Math.ceil(thumb.h * SCALE);
  const window = new BrowserWindow({ width, height, useContentSize: true, show: false, webPreferences: { offscreen: true } });
  const ready = new Promise<void>((resolve) => waiters.set(thumb.id, resolve));
  await window.loadURL(pageUrl(`thumb-src/${thumb.id}.html`));
  await Promise.race([ready, new Promise((resolve) => setTimeout(resolve, 15000))]);
  const image = await window.webContents.capturePage({ x: 0, y: 0, width, height });
  writeFileSync(join(dist, "thumbs", `${thumb.id}.png`), image.toPNG());
  window.destroy();
};

registerScheme();

app.on("window-all-closed", () => undefined);

app.whenReady().then(async () => {
  serveDist(dist, { "/__ready": (url) => waiters.get(url.searchParams.get("id") ?? "")?.() });
  mkdirSync(join(dist, "thumbs"), { recursive: true });
  const thumbs = parseThumbs();
  const started = Date.now();
  for (const thumb of thumbs) await capture(thumb).catch((error: unknown) => console.error(`thumb ${thumb.id}: ${String(error)}`));
  console.log(`thumbs: ${thumbs.length} in ${Date.now() - started} ms`);
  app.quit();
});
