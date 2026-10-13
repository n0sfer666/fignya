import { contentOf, type Screen } from "@fignya/model";

export const contentClip = (screen: Screen): string => {
  const { x, y, width, height } = contentOf(screen);
  return `polygon(${x}px ${y}px,${x + width}px ${y}px,${x + width}px ${y + height}px,${x}px ${y + height}px)`;
};
