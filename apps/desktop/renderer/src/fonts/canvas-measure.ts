import type { Measure } from "./font-presence";

const SAMPLE = "mmmmmmmmmmlli1WQ@#жщ";

export const canvasMeasure = (): Measure => {
  const context = document.createElement("canvas").getContext("2d");
  return (font) => {
    if (!context) return 0;
    context.font = font;
    return context.measureText(SAMPLE).width;
  };
};
