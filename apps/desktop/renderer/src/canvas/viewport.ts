import type { Screen } from "@fignya/model";
import type { CanvasZoom } from "../../../shared/api";

export type View = { x: number; y: number; zoom: number };
export type Bounds = { x: number; y: number; width: number; height: number };

export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 8;

const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export const boundsOf = (screens: Screen[]): Bounds | undefined => {
  if (screens.length === 0) return undefined;
  const left = Math.min(...screens.map((s) => s.x));
  const top = Math.min(...screens.map((s) => s.y));
  const right = Math.max(...screens.map((s) => s.x + s.width));
  const bottom = Math.max(...screens.map((s) => s.y + s.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

export const fitView = (bounds: Bounds, width: number, height: number, padding: number): View => {
  const zoom = clampZoom(Math.min((width - padding * 2) / Math.max(1, bounds.width), (height - padding * 2) / Math.max(1, bounds.height), 1));
  return {
    zoom,
    x: (width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: (height - bounds.height * zoom) / 2 - bounds.y * zoom,
  };
};

export const panBy = (view: View, dx: number, dy: number): View => ({ ...view, x: view.x + dx, y: view.y + dy });

export const zoomAround = (view: View, factor: number, px: number, py: number): View => {
  const zoom = clampZoom(view.zoom * factor);
  const k = zoom / view.zoom;
  return { zoom, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
};

const STEP_FACTOR: Record<CanvasZoom, (zoom: number) => number> = {
  in: () => 2,
  out: () => 0.5,
  actual: (zoom) => 1 / zoom,
};

export const zoomStep = (view: View, step: CanvasZoom, px: number, py: number): View => zoomAround(view, STEP_FACTOR[step](view.zoom), px, py);

export const toWorld = (view: View, px: number, py: number): { x: number; y: number } => ({
  x: (px - view.x) / view.zoom,
  y: (py - view.y) / view.zoom,
});
