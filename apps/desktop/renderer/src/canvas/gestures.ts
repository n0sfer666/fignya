const CLICK_SLOP = 4;
const ZOOM_SPEED = 0.01;

export type GestureHandlers = {
  pan: (dx: number, dy: number) => void;
  zoom: (factor: number, x: number, y: number) => void;
  click: (target: EventTarget | null) => void;
};

export const bindGestures = (el: HTMLElement, on: GestureHandlers): (() => void) => {
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
      if (clicked && !dragged) on.click(e.target);
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
  el.addEventListener("wheel", wheel, { passive: false });
  el.addEventListener("pointerdown", down);
  return () => {
    el.removeEventListener("wheel", wheel);
    el.removeEventListener("pointerdown", down);
  };
};
