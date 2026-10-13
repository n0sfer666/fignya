import { writeFileSync } from "node:fs";
import { isRec, sleep, waitFor, type Evaluate, type Send } from "./cdp";

export const ROOT = `document.querySelector(".screen.live > [data-screen]")?.shadowRoot`;

export const META = 4;

export const SHIFT = 8;

export const createUi = (send: Send, ev: Evaluate, dir: string) => {
  const key = async (k: string, code: string, vk: number, modifiers = 0): Promise<void> => {
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: k, code, windowsVirtualKeyCode: vk, modifiers });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, modifiers });
  };
  const click = async (x: number, y: number, modifiers = 0): Promise<void> => {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, modifiers, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, modifiers, button: "left", clickCount: 1 });
  };
  const shot = async (name: string): Promise<void> => {
    const result = await send("Page.captureScreenshot", { format: "png" });
    if (isRec(result) && typeof result.data === "string") writeFileSync(`${dir}/${name}.png`, Buffer.from(result.data, "base64"));
  };
  const inspector = (): Promise<unknown> =>
    ev(`Object.fromEntries([...document.querySelectorAll(".inspector section")].map((s) => [s.querySelector("h2")?.textContent, Object.fromEntries([...s.querySelectorAll("dt")].map((dt) => { const dd = dt.nextElementSibling; return [dt.textContent, dd?.querySelector("input,textarea")?.value ?? dd?.textContent]; }))]))`);
  const row = async (section: string, name: string): Promise<unknown> => {
    const shown = await inspector();
    const rows = isRec(shown) ? shown[section] : undefined;
    return isRec(rows) ? rows[name] : undefined;
  };
  const openScreen = async (screenId: string): Promise<boolean> => {
    await key("f", "KeyF", 70, META);
    await sleep(400);
    await send("Input.insertText", { text: screenId });
    await waitFor(async () => (await ev(`document.querySelectorAll(".search li").length`)) !== 0, 5000);
    await key("Enter", "Enter", 13);
    return waitFor(async () => (await ev(`document.querySelector(".screen.live")?.dataset.screenId === ${JSON.stringify(screenId)} && !!document.querySelector(".node-selection")`)) === true, 15000);
  };
  const focus = async (field: string): Promise<boolean> =>
    (await ev(`(() => {
      const dt = [...document.querySelectorAll(".inspector dt")].find((d) => d.textContent === ${JSON.stringify(field)});
      const input = dt?.nextElementSibling?.querySelector("input,textarea");
      if (!input) return false;
      input.focus();
      input.select();
      return true;
    })()`)) === true;
  const type = async (field: string, text: string): Promise<boolean> => {
    if (!(await focus(field))) return false;
    await send("Input.insertText", { text });
    await key("Enter", "Enter", 13);
    return true;
  };
  return { key, click, shot, inspector, row, openScreen, focus, type };
};
