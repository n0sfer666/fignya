import type { Fetcher } from "../main/google-fonts";

export const cssAnswer = (weight: number, italic: boolean, file: string): string =>
  `@font-face { font-family: 'X'; font-style: ${italic ? "italic" : "normal"}; font-weight: ${weight}; src: url(https://fonts.gstatic.com/s/${file}) format('woff2'); unicode-range: U+0400-045F; }`;

export const fakeFetcher = (routes: Record<string, () => Response>, seen: string[] = []): Fetcher => async (url) => {
  seen.push(url);
  const route = routes[url];
  if (!route) return new Response("Missing font family", { status: 400 });
  return route();
};
