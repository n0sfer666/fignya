import type { Plugin } from "vite";

const POLICY = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' fignya: data:; font-src 'self' fignya: data:";

const DEV_POLICY = `${POLICY}; connect-src 'self' ws:`;

export const cspPlugin = (): Plugin => ({
  name: "fignya-csp",
  transformIndexHtml: (_html, ctx) => [
    { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: ctx.server ? DEV_POLICY : POLICY }, injectTo: "head-prepend" },
  ],
});
