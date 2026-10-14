import { describe, expect, it } from "vitest";
import { hitNode } from "../../renderer/src/canvas/hit-node";

const live = (): { host: HTMLElement; root: ShadowRoot } => {
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<div data-id="s"><div data-id="v"><svg><path></path></svg></div></div>`;
  document.body.append(host);
  return { host, root };
};

describe("hitNode", () => {
  it("returns the deepest [data-id] element of the composed path inside the shadow root", () => {
    const { host, root } = live();
    const path = root.querySelector("path");
    const svg = root.querySelector("svg");
    const v = root.querySelector('[data-id="v"]');
    const s = root.querySelector('[data-id="s"]');
    if (!path || !svg || !v || !s) throw new Error("tree missing");
    expect(hitNode([path, svg, v, s, root, host, document.body], root)).toBe(v);
  });

  it("returns nothing for a path outside the shadow root", () => {
    const { host, root } = live();
    const other = live();
    const outside = other.root.querySelector('[data-id="s"]');
    if (!outside) throw new Error("tree missing");
    expect(hitNode([host, document.body], root)).toBeUndefined();
    expect(hitNode([outside, other.root, other.host], root)).toBeUndefined();
  });
});
