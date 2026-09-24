export type View = { x: number; y: number; s: number };

export const applyView = (world: HTMLElement, v: View): void => {
  world.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.s})`;
};

export const fitView = (w: number, h: number, vw: number, vh: number): View => {
  const s = Math.min(vw / w, vh / h) * 0.9;
  return { x: (vw - w * s) / 2, y: (vh - h * s) / 2, s };
};

export const panAt = (t: number, s: number, w: number, h: number, vw: number, vh: number): View => {
  const phase = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
  return { x: -Math.max(0, w * s - vw) * phase, y: -Math.max(0, h * s - vh) * Math.sin(Math.PI * t), s };
};

export const zoomAt = (t: number, base: number, vw: number, vh: number, cx: number, cy: number): View => {
  const s = base * 2 ** (2 * Math.sin(2 * Math.PI * t));
  return { x: vw / 2 - cx * s, y: vh / 2 - cy * s, s };
};
