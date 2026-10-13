import { isDoubleClick, type Tap } from "./double-click";

const CLICK_SLOP = 4;
const ZOOM_SPEED = 0.01;

export type GesturePoint = { path: EventTarget[]; meta: boolean };

export type GestureTap = GesturePoint & { target: EventTarget | null; double: boolean };

export type GestureHandlers = {
  pan: (dx: number, dy: number) => void;
  zoom: (factor: number, x: number, y: number) => void;
  click: (tap: GestureTap) => void;
  hover: (point: GesturePoint | undefined) => void;
};

export const bindGestures = (el: HTMLElement, on: GestureHandlers): (() => void) => {
  let lastTap: Tap | undefined;
  const local = (e: MouseEvent): { x: number; y: number } => {
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const wheel = (e: WheelEvent): void => {
    e.preventDefault();
    const p = local(e);
    if (e.ctrlKey || e.metaKey) on.zoom(Math.exp(-e.deltaY * ZOOM_SPEED), p.x, p.y);
    else on.pan(-e.deltaX, -e.deltaY);
  };
  const down = (e: PointerEvent): void => {
    if (e.button !== 0 && e.button !== 1) return;
    const start = { x: e.clientX, y: e.clientY };
    const path = e.composedPath();
    let last = start;
    let dragged = false;
    el.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent): void => {
      if (m.pointerId !== e.pointerId) return;
      dragged ||= Math.hypot(m.clientX - start.x, m.clientY - start.y) > CLICK_SLOP;
      if (dragged) on.pan(m.clientX - last.x, m.clientY - last.y);
      last = { x: m.clientX, y: m.clientY };
    };
    const end = (clicked: boolean): void => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
      el.removeEventListener("lostpointercapture", cancel);
      if (dragged) lastTap = undefined;
      else if (clicked && e.button === 0) tap();
    };
    const tap = (): void => {
      const next = { time: e.timeStamp, x: e.clientX, y: e.clientY };
      const double = isDoubleClick(lastTap, next, CLICK_SLOP);
      lastTap = double ? undefined : next;
      on.click({ target: e.target, path, meta: e.metaKey, double });
    };
    const up = (u: PointerEvent): void => {
      if (u.pointerId === e.pointerId) end(true);
    };
    const cancel = (c: PointerEvent): void => {
      if (c.pointerId === e.pointerId) end(false);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("lostpointercapture", cancel);
  };
  const hover = (m: PointerEvent): void => {
    if (m.buttons === 0) on.hover({ path: m.composedPath(), meta: m.metaKey });
  };
  const leave = (): void => on.hover(undefined);
  el.addEventListener("wheel", wheel, { passive: false });
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", hover);
  el.addEventListener("pointerleave", leave);
  return () => {
    el.removeEventListener("wheel", wheel);
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", hover);
    el.removeEventListener("pointerleave", leave);
  };
};
