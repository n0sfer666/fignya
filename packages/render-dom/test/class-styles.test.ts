import { describe, expect, it } from "vitest";
import { classStyles } from "../src/class-styles";

const tree = (html: string): HTMLElement => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
};

describe("classStyles", () => {
  it("moves inline styles into shared classes in document order", () => {
    const root = tree('<div id="a" style="width: 10px;"><div id="b" style="color: red;"></div><div id="c" style="width: 10px;"></div></div>');
    const rules = classStyles(root);
    expect(rules).toEqual([".n1{width: 10px;}", ".n2{color: red;}"]);
    expect(root.querySelector("#a")?.getAttribute("class")).toBe("n1");
    expect(root.querySelector("#b")?.getAttribute("class")).toBe("n2");
    expect(root.querySelector("#c")?.getAttribute("class")).toBe("n1");
    expect(root.querySelector("[style]")).toBeNull();
  });

  it("includes the root and svg elements", () => {
    const root = tree('<svg style="left: 1px;"><path d="M0 0"></path></svg>');
    root.setAttribute("style", "top: 2px;");
    expect(classStyles(root)).toEqual([".n1{top: 2px;}", ".n2{left: 1px;}"]);
    expect(root.querySelector("svg")?.getAttribute("class")).toBe("n2");
  });

  it("drops empty styles without a class", () => {
    const root = tree('<div style=""></div>');
    expect(classStyles(root)).toEqual([]);
    expect(root.querySelector("div")?.hasAttribute("class")).toBe(false);
    expect(root.querySelector("[style]")).toBeNull();
  });
});
