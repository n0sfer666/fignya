const { app, BrowserWindow } = require("electron");
const { join } = require("node:path");
const http = require("node:http");
const fs = require("node:fs");
const dir = join(__dirname, "out", "zoom");
const probe = (image, x, y) => { const s = image.getSize(); const b = image.toBitmap(); const i = (y * s.width + x) * 4; return b[i + 2] === 255 && b[i + 1] === 0 ? "red" : "white"; };
const thumbState = async (thumb, w, h) => {
  thumb.setContentSize(w, h);
  await thumb.webContents.executeJavaScript(`m.style.left='${w - 20}px';m.style.top='${h - 20}px';new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  const inner = await thumb.webContents.executeJavaScript("`${innerWidth}x${innerHeight}`");
  const image = await thumb.webContents.capturePage({ x: 0, y: 0, width: w, height: h });
  return `zoom ${thumb.webContents.getZoomLevel()} inner ${inner} corner ${probe(image, w - 5, h - 5)}`;
};
app.whenReady().then(async () => {
  const server = http.createServer((req, res) => res.end(fs.readFileSync(join(dir, req.url.slice(1))))).listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://localhost:${server.address().port}`;
  const main = new BrowserWindow({ show: false, width: 600, height: 400 });
  await main.loadURL(`${base}/main.html`);
  for (const pin of [false, true]) {
    const thumb = new BrowserWindow({ show: false, width: 400, height: 400, useContentSize: true, webPreferences: { offscreen: true, backgroundThrottling: false } });
    await thumb.loadURL(`${base}/thumb.html`);
    main.webContents.setZoomLevel(0);
    if (pin) thumb.webContents.on("zoom-changed", () => undefined);
    console.log(`pin=${pin} before: ${await thumbState(thumb, 2880, 1920)}`);
    main.webContents.setZoomLevel(0.5);
    await new Promise((r) => setTimeout(r, 200));
    if (pin) thumb.webContents.setZoomFactor(1);
    console.log(`pin=${pin} main zoom 0.5: ${await thumbState(thumb, 2880, 1920)} main ${main.webContents.getZoomLevel()}`);
    thumb.destroy();
  }
  server.close();
  app.quit();
});
