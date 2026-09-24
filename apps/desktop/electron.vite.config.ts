import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import solid from "vite-plugin-solid";
import { cspPlugin } from "./config/csp-plugin";
import { sourceHash } from "./config/source-hash";

const at = (path: string): string => resolve(__dirname, path);

const RENDER_SOURCES = ["packages/model/src", "packages/fig-import/src", "packages/render-dom/src", "apps/desktop/renderer/src/thumb.ts", "apps/desktop/renderer/thumb.html", "apps/desktop/main/thumb-scale.ts", "apps/desktop/main/thumb-renderer.ts", "apps/desktop/shared/urls.ts"];

export default defineConfig({
  main: {
    define: { RENDER_HASH: JSON.stringify(sourceHash(at("../.."), RENDER_SOURCES)) },
    build: { rollupOptions: { input: { index: at("main/index.ts"), importer: at("importer/index.ts") } } },
  },
  preload: { build: { rollupOptions: { input: { index: at("preload/index.ts") } } } },
  renderer: {
    root: at("renderer"),
    plugins: [solid(), cspPlugin()],
    build: { rollupOptions: { input: { index: at("renderer/index.html"), thumb: at("renderer/thumb.html") } } },
  },
});
