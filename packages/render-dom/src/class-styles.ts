export const classStyles = (root: Element): string[] => {
  const names = new Map<string, string>();
  for (const el of [root, ...root.querySelectorAll("[style]")]) {
    const style = el.getAttribute("style");
    if (style === null) continue;
    el.removeAttribute("style");
    if (!style.trim()) continue;
    const name = names.get(style) ?? `n${names.size + 1}`;
    names.set(style, name);
    el.classList.add(name);
  }
  return [...names].map(([style, name]) => `.${name}{${style}}`);
};
