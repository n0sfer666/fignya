const { app, BrowserWindow } = require("electron");
const html = "<style>html{overflow:hidden;background:#fff}body{margin:0}</style><div id=m style='position:absolute;width:20px;height:20px;background:red'></div>";
const probe = (image, x, y) => { const s = image.getSize(); const b = image.toBitmap(); const i = (y * s.width + x) * 4; return `${b[i + 2]},${b[i + 1]},${b[i]}`; };
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 400, height: 400, useContentSize: true, webPreferences: { offscreen: true, backgroundThrottling: false } });
  await window.loadURL(`data:text/html,${encodeURIComponent(html)}`);
  for (const [w, h, wait] of [[1440, 960, 0], [2880, 1920, 0], [2880, 1920, 0], [2880, 1920, 500], [1440, 960, 500], [2880, 1920, 50]]) {
    window.setContentSize(w, h);
    await window.webContents.executeJavaScript(`m.style.left='${w - 20}px';m.style.top='${h - 20}px';new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    await new Promise((r) => setTimeout(r, wait));
    const inner = await window.webContents.executeJavaScript("`${innerWidth}x${innerHeight}`");
    const image = await window.webContents.capturePage({ x: 0, y: 0, width: w, height: h });
    const s = image.getSize();
    console.log(`set ${w}x${h} wait ${wait} inner ${inner} capture ${s.width}x${s.height} corner ${probe(image, s.width - 5, s.height - 5)} inside ${probe(image, s.width - 25, s.height - 25)}`);
  }
  app.quit();
});
