import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "model", root: "packages/model" } },
      { test: { name: "fig-import", root: "packages/fig-import" } },
      { test: { name: "render-dom", root: "packages/render-dom", environment: "happy-dom" } },
      { test: { name: "desktop", root: "apps/desktop" } },
    ],
  },
});
