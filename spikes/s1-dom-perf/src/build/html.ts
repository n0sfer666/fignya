const STYLE = [
  "html,body{margin:0;height:100%;overflow:hidden;background:#e5e5e5}",
  "#viewport{position:absolute;inset:0;overflow:hidden}",
  "#world{position:absolute;left:0;top:0;transform-origin:0 0}",
  "#world *{box-sizing:border-box}",
  "#world svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}",
].join("");

export const pageHtml = (scene: object, script: string, base = ""): string => {
  const json = JSON.stringify(scene).replaceAll("<", "\\u003c");
  return [
    "<!doctype html><html><head><meta charset=utf-8>",
    base ? `<base href="${base}">` : "",
    `<style>${STYLE}</style></head><body>`,
    '<div id="viewport"><div id="world"></div></div>',
    `<script type="application/json" id="scene">${json}</script>`,
    `<script src="${script}"></script>`,
    "</body></html>",
  ].join("");
};
