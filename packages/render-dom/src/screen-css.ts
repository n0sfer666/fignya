export const HOST_CSS = "display:block;width:max-content;contain:layout";

export const NODE_CSS = ["*{box-sizing:border-box}", "svg{position:absolute;inset:0;width:100%;height:100%;min-width:1px;min-height:1px;overflow:visible}"].join("");

export const SCREEN_CSS = `:host{${HOST_CSS}}${NODE_CSS}`;
