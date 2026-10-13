import { describe, expect, it } from "vitest";
import type { DesignNode } from "@fignya/model";
import { exportScreen } from "../src";
import { frame, modelOf } from "./nodes";

const imageUrl = (hash: string): string => `images/${hash}.png`;

const parsed = (html: string): DocumentFragment => {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
};

const text = (id: string, fontFamily: string): DesignNode => ({ id, name: id, kind: "text", children: [], style: { fontFamily, fontSize: 12 }, text: id });

describe("exportScreen", () => {
  it("lists the font families of the screen without empty names", () => {
    const model = modelOf("s", [frame("s", ["a", "b", "c"]), text("a", "Inter"), text("b", ""), text("c", "Inter")]);
    expect(exportScreen(model, { imageUrl, title: "s" }).families).toEqual(["Inter"]);
  });

  it("writes a standalone document linking styles.css with the escaped title", () => {
    const { html } = exportScreen(modelOf("s", [frame("s", [], { width: 375 })]), { imageUrl, title: "Home </title><b>" });
    const doc = parsed(html);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(doc.querySelector("title")?.textContent).toBe("Home </title><b>");
    expect(doc.querySelector("link[rel=stylesheet]")?.getAttribute("href")).toBe("styles.css");
    expect(doc.querySelector("meta[charset]")?.getAttribute("charset")).toBe("utf-8");
  });

  it("keeps node ids and replaces inline styles with classes", () => {
    const model = modelOf("s", [frame("s", ["a", "b"], { width: 375 }), frame("a", [], { width: 10 }), frame("b", [], { width: 10 })]);
    const { html, css } = exportScreen(model, { imageUrl, title: "s" });
    const body = parsed(html);
    const screen = body.querySelector("[data-screen=s]");
    expect(screen?.querySelector("[data-id=s]")?.getAttribute("data-kind")).toBe("frame");
    expect(body.querySelector("[style]")).toBeNull();
    const a = body.querySelector("[data-id=a]")?.getAttribute("class");
    expect(a).toBeTruthy();
    expect(body.querySelector("[data-id=b]")?.getAttribute("class")).toBe(a);
    expect(css).toContain(`.${a ?? ""}{width: 10px;}`);
  });

  it("styles the page like the shadow root of a live screen", () => {
    const { css } = exportScreen(modelOf("s", [frame("s")]), { imageUrl, title: "s" });
    expect(css).toContain("body{margin:0}");
    expect(css).toContain("[data-screen]{display:block;width:max-content;contain:layout}");
    expect(css).toContain("*{box-sizing:border-box}");
    expect(css).toContain("svg{position:absolute");
  });

  it("points images at the export paths", () => {
    const model = modelOf("s", [frame("s", [], { background: [{ kind: "image", hash: "ab12", fit: "cover" }] })]);
    const { html, css } = exportScreen(model, { imageUrl, title: "s" });
    expect(css).toContain("images/ab12.png");
    expect(html + css).not.toContain("fignya://");
  });

  it("lists the font families of rendered text once, overrides applied", () => {
    const instance: DesignNode = {
      id: "i",
      name: "i",
      kind: "instance",
      children: [],
      style: {},
      componentId: "c",
      overrides: [{ path: ["t2"], style: { fontFamily: "Roboto" } }],
    };
    const model = modelOf("s", [frame("s", ["t1", "i"]), text("t1", "Inter"), instance, frame("c", ["t2"]), text("t2", "Inter")]);
    expect(exportScreen(model, { imageUrl, title: "s" }).families).toEqual(["Inter", "Roboto"]);
  });
});
