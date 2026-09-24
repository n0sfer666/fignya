const URL_RE = /url\("?([^")]+)"?\)/g;

const collectUrls = (root: HTMLElement): Set<string> => {
  const urls = new Set<string>();
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    for (const match of el.style.backgroundImage.matchAll(URL_RE)) {
      if (match[1]) urls.add(match[1]);
    }
  }
  for (const img of root.querySelectorAll("img")) urls.add(img.src);
  return urls;
};

export const waitImages = async (root: HTMLElement): Promise<number> => {
  const urls = [...collectUrls(root)];
  await Promise.all(
    urls.map((url) => {
      const img = new Image();
      img.src = url;
      return img.decode().catch(() => undefined);
    }),
  );
  return urls.length;
};

export const nextFrame = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));
