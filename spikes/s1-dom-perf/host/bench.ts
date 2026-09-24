import { app, BrowserWindow } from "electron";
import { writeFileSync } from "node:fs";
import { requireEnv } from "./env";
import { pageUrl, registerScheme, serveDist } from "./protocol";

const dist = requireEnv("DIST_DIR");
const resultFile = requireEnv("RESULT_FILE");
const scenario = requireEnv("SCENARIO");

registerScheme();

app.whenReady().then(() => {
  serveDist(dist, { "/__report": (url) => writeFileSync(resultFile, url.search.slice(1)) });
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    useContentSize: true,
    webPreferences: { backgroundThrottling: false },
  });
  window.loadURL(pageUrl(scenario));
});
